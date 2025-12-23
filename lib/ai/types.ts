import { z } from 'zod'

export const RequestSchema = z.object({
  userMessage: z.string().min(1),
  documentHtml: z.string(),
  selectionText: z.string().nullable().optional(),
  selectionHtml: z.string().nullable().optional(),
})

export type AIRequest = z.infer<typeof RequestSchema>

export const EditOperationSchema = z.object({
  id: z.string(),
  title: z.string(),
  mode: z.enum(['insert_at_cursor', 'replace_selection', 'append_to_end', 'inline_suggestion', 'delete', 'find_and_replace']),
  contentHtml: z.string(),
  originalHtml: z.string().optional(),
  // For find_and_replace mode: the text/content to find and replace
  targetText: z.string().optional(),
  // For find_and_replace mode: where to look (heading, paragraph, section title, etc.)
  targetHint: z.string().optional(),
})

export type EditOperation = z.infer<typeof EditOperationSchema>

export const ResponseSchema = z.object({
  assistantText: z.string(),
  edits: z.array(EditOperationSchema),
})

export type AIResponse = z.infer<typeof ResponseSchema>
