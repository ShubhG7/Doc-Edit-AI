import { anthropic } from '@ai-sdk/anthropic'
import { streamText, tool, convertToModelMessages } from 'ai'
import { z } from 'zod'
import { SYSTEM_PROMPT } from '@/lib/ai/prompt'

export const maxDuration = 120

// Tools with execute functions to properly terminate tool calls
const tools = {
  apply_edit: tool({
    description: 'Create or apply an edit to the document content (the body/text of the document)',
    inputSchema: z.object({
      title: z.string().describe('Short title of the edit'),
      mode: z.enum(['insert_at_cursor', 'replace_selection', 'append_to_end', 'inline_suggestion']).describe('The mode of operation for the edit'),
      contentHtml: z.string().describe('The HTML content to insert or replace. Use semantic HTML.'),
      originalHtml: z.string().optional().describe('Original HTML content, required if mode is inline_suggestion'),
    }),
    // Execute function to mark tool as complete (actual edit happens client-side)
    execute: async (args) => {
      return { success: true, mode: args.mode, title: args.title }
    },
  }),
  update_document_title: tool({
    description: 'Update the document title/name (the metadata title that appears in the document list and browser tab, NOT a heading in the content)',
    inputSchema: z.object({
      newTitle: z.string().min(1).describe('The new title for the document'),
    }),
    // Execute function to mark tool as complete (actual title change happens client-side)
    execute: async (args) => {
      return { success: true, newTitle: args.newTitle }
    },
  }),
}

export async function POST(req: Request) {
  try {
    const { messages, documentHtml, selectionText, documentTitle } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400 })
    }

    let modelMessages: any[] = []
    try {
      modelMessages = await convertToModelMessages(messages, {
          ignoreIncompleteToolCalls: true
      })
    } catch {
      modelMessages = messages.map((m: any) => ({
        role: m.role || 'user',
        content: typeof m.content === 'string' ? m.content : (m.text || 'Hello')
      }))
    }
    
    if (!modelMessages || modelMessages.length === 0) {
        const lastInput = messages[messages.length - 1]
        modelMessages = [{
          role: 'user',
          content: lastInput?.content || lastInput?.text || 'Hello'
        }]
    }

    const initialMessages = modelMessages.slice(0, -1)
    const lastMessage = modelMessages[modelMessages.length - 1]

    let lastMessageText = 'Follow the user intent based on history'
    if (lastMessage) {
      if (typeof lastMessage.content === 'string') {
        lastMessageText = lastMessage.content
      } else if (Array.isArray(lastMessage.content)) {
        const textParts = lastMessage.content
          .filter((p: any) => p && p.type === 'text')
          .map((p: any) => p.text || '')
        lastMessageText = textParts.join('\n') || lastMessageText
      }
    }

    const isFreshDocument = (!documentTitle || documentTitle === 'Untitled Document') && 
                            (!documentHtml || documentHtml === '<p>Start writing...</p>' || documentHtml === 'Empty Document')
    
    const hasExistingContent = documentHtml && 
      documentHtml !== '<p>Start writing...</p>' && 
      documentHtml !== '<p></p>' &&
      documentHtml.length > 50

    const contextMessage = `
User Request:
${lastMessageText}

Document Title: ${documentTitle || 'Untitled Document'}

=== CURRENT DOCUMENT CONTENT (ANALYZE THIS CAREFULLY) ===
${documentHtml || 'Empty Document'}
=== END OF DOCUMENT CONTENT ===

${hasExistingContent ? `
IMPORTANT: The document above contains existing content. Before generating any new content:
1. Read and understand the document's topic, themes, and key points
2. Match the tone, style, and vocabulary used
3. If adding an introduction: summarize/preview the main topics covered
4. If adding a conclusion: summarize the key points made
5. Ensure seamless integration with existing content
` : ''}

Selection:
${selectionText || 'No selection'}

${isFreshDocument ? `FRESH DOCUMENT MODE: This is a new document. You MUST call update_document_title AND apply_edit.` : ''}

DIRECTIVE: Fulfill the request immediately using the tools. Do not ask questions.
`

    const result = streamText({
      model: anthropic('claude-sonnet-4-5'),
      system: SYSTEM_PROMPT,
      messages: [
        ...initialMessages,
        { role: 'user', content: contextMessage }
      ],
      tools,
      toolChoice: 'auto',
      ...(isFreshDocument ? {
        providerOptions: {
          anthropic: {
            thinking: { type: 'enabled', budgetTokens: 8000 }
          }
        }
      } : {})
    })

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error('AI route error:', error)
    return new Response(JSON.stringify({ 
      error: 'AI request failed',
      details: error?.message || 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
