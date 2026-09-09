import Anthropic from '@anthropic-ai/sdk'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

const EXTRACTION_PROMPT = `You are analyzing a dealership vendor contract document. Extract the following fields and return them as a JSON object.

Fields:
- vendor_name (string): Company providing the service
- service_type (string): What the contract covers — use one of: DMS, CRM, F&I, F&I Products, Service, Parts, Marketing, Website, Inventory, or the closest match
- monthly_cost (number): Monthly fee in USD
- term_months (number): Contract duration in months
- auto_renewal (boolean): Whether the contract auto-renews
- escalator_pct (number | null): Annual price increase percentage
- cancellation_notice_days (number): Days notice required to cancel
- early_termination_fee (number | null): Penalty amount for early exit
- data_exportable (boolean): Whether the dealership can export their data
- data_ownership (string): Who owns the data — must be exactly one of: "dealership", "vendor", "shared"
- additional_fees (array): Array of {name: string, amount: number} for setup fees, training fees, etc.
- key_clauses (array): Array of strings summarizing notable contract clauses

Rules:
- Return ONLY valid JSON — no markdown, no code fences, no commentary
- If a field cannot be determined from the document, return null — never guess
- For monetary values, return numbers only (no currency symbols or commas)
- For boolean fields, return true or false`

function getClient() {
  return new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  })
}

export async function pdfToImages(file, onPage) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const images = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    const dataUrl = canvas.toDataURL('image/png')
    images.push(dataUrl)
    if (onPage) onPage(dataUrl, i, pdf.numPages)
  }

  return images
}

export async function extractContractData(pageImages) {
  const client = getClient()

  const content = pageImages.map(img => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/png',
      data: img.replace(/^data:image\/png;base64,/, ''),
    },
  }))

  content.push({ type: 'text', text: EXTRACTION_PROMPT })

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content }],
  })

  const textBlock = response.content.find(block => block.type === 'text')
  if (!textBlock?.text) throw new Error('No text in extraction response')
  const cleaned = textBlock.text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned)
}
