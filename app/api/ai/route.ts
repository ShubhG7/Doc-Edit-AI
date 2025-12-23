import { anthropic } from '@ai-sdk/anthropic'
import { streamText, tool, convertToModelMessages } from 'ai'
import { z } from 'zod'
import { SYSTEM_PROMPT } from '@/lib/ai/prompt'

export const maxDuration = 120

// Tool definitions - these are UI-only tools (no server execution)
// The client handles applying edits and title changes
const tools = {
  apply_edit: tool({
    description: 'Create or apply an edit to the document content (the body/text of the document)',
    inputSchema: z.object({
      title: z.string().describe('Short title of the edit'),
      mode: z.enum(['insert_at_cursor', 'replace_selection', 'append_to_end', 'inline_suggestion']).describe('The mode of operation for the edit'),
      contentHtml: z.string().describe('The HTML content to insert or replace. Use semantic HTML.'),
      originalHtml: z.string().optional().describe('Original HTML content, required if mode is inline_suggestion'),
    }),
  }),
  update_document_title: tool({
    description: 'Update the document title/name (the metadata title that appears in the document list and browser tab, NOT a heading in the content)',
    inputSchema: z.object({
      newTitle: z.string().min(1).describe('The new title for the document'),
    }),
  }),
}

export async function POST(req: Request) {
  try {
    const { messages, documentHtml, selectionText, documentTitle } = await req.json()

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400 })
    }

    // AI SDK v6 requires converting UI messages to ModelMessages for streamText
    // We ignore incomplete tool calls to avoid "Each tool_use block must have a corresponding tool_result block" error
    let modelMessages: any[] = []
    try {
      modelMessages = await convertToModelMessages(messages, {
          ignoreIncompleteToolCalls: true
      })
    } catch {
      // Fallback: create simple messages from the input
      modelMessages = messages.map((m: any) => ({
        role: m.role || 'user',
        content: typeof m.content === 'string' ? m.content : (m.text || 'Hello')
      }))
    }
    
    if (!modelMessages || modelMessages.length === 0) {
        // Fallback to creating a message from the last input
        const lastInput = messages[messages.length - 1]
        modelMessages = [{
          role: 'user',
          content: lastInput?.content || lastInput?.text || 'Hello'
        }]
    }

    const initialMessages = modelMessages.slice(0, -1)
    const lastMessage = modelMessages[modelMessages.length - 1]

    // Safely extract text from the last message
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

    // Detect if this is a fresh document that needs deep research
    const isFreshDocument = (!documentTitle || documentTitle === 'Untitled Document') && 
                            (!documentHtml || documentHtml === '<p>Start writing...</p>' || documentHtml === 'Empty Document')
    
    const contextMessage = `
User Request:
${lastMessageText}

Document Title: ${documentTitle || 'Untitled Document'}

Document Content:
${documentHtml || 'Empty Document'}

Selection:
${selectionText || 'No selection'}

${isFreshDocument ? `FRESH DOCUMENT MODE: This is a new document. You MUST:
1. Think deeply about the topic and structure before writing
2. Research and consider multiple angles and perspectives
3. Call update_document_title with an appropriate title
4. Provide comprehensive, well-researched content` : ''}

DIRECTIVE: Fulfill the User Request above immediately. If the request is to write or create content, use apply_edit. If the request is to rename/retitle the document, use update_document_title. Do not ask for context.
`

    // Use extended thinking for fresh documents to enable deep research
    const result = streamText({
      model: anthropic('claude-sonnet-4-5'),
      system: SYSTEM_PROMPT,
      messages: [
        ...initialMessages,
        { role: 'user', content: contextMessage }
      ],
      tools,
      // Enable extended thinking for fresh documents
      ...(isFreshDocument ? {
        providerOptions: {
          anthropic: {
            thinking: { type: 'enabled', budgetTokens: 10000 }
          }
        }
      } : {})
    })

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: 'AI request failed',
      details: error?.message || 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
