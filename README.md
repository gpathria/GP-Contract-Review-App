# Contract Review App

A simple web app for asking questions about a PDF contract. Upload a contract, read it on the left, and chat with it on the right. Answers come back with the supporting clauses quoted.

Built with plain HTML, CSS and JavaScript. No frameworks, no npm, no build step.

## Key features

- **PDF upload:** drag and drop a PDF or browse for one.
- **Contract preview:** the uploaded PDF shows in the left panel and scrolls on its own.
- **Chat panel:** ask questions on the right, with suggested questions to start.
- **Cited answers:** each reply shows the answer, the clause text that supports it, and a short explanation of how.
- **Webhook backed:** the PDF and your question are sent to an n8n webhook, which returns the answer as JSON.
- **Responsive layout:** two columns on desktop, stacked on small screens.

## Run it locally

1. Download or clone this repository.
2. Open `index.html` in your browser (double-click it).

That's all. There is nothing to install.

## Connecting the webhook

Replies come from an n8n webhook. The URL is set at the top of `app.js` (`WEBHOOK_URL`). The app sends a multipart form with two fields, `file` (the PDF) and `message` (your question), and expects JSON back:

```json
{
  "response": "The answer based on the contract",
  "citation": ["Section 4.2: the supporting clause text"],
  "reasoning": "One or two sentences on how the citations support the answer"
}
```

Notes:
- A `webhook-test` URL only works while the n8n workflow is listening for a test event. Use the production URL once the workflow is active.
- The webhook must allow requests from the browser (CORS). In n8n, set the Webhook node's **Allowed Origins (CORS)** option.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `styles.css` | Navy and orange styling and layout |
| `app.js` | Upload, PDF preview, chat and webhook logic |
