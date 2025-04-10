
# PDF Extraction Edge Function

This Edge Function extracts text and images from PDF files. It uses the PDF.co API for extraction.

## Setup

1. You need to sign up for a PDF.co API key at https://pdf.co/
2. Add your API key to the Supabase Edge Function secrets:

```bash
supabase secrets set PDF_CO_API_KEY=your_api_key_here
```

## Usage

This function accepts a PDF file through a FormData POST request and returns:

- Extracted text content
- Extracted images as base64 strings
- Number of pages
- The original filename

### Example Request

```javascript
const formData = new FormData();
formData.append('file', pdfFile);

const { data, error } = await supabase.functions.invoke('extract-pdf', {
  body: formData,
});

if (error) {
  console.error('PDF extraction failed:', error);
}

console.log('Extracted PDF data:', data);
```

### Response Format

```json
{
  "text": "Extracted text content...",
  "images": ["data:image/png;base64,...", "data:image/png;base64,..."],
  "pages": 5,
  "filename": "document.pdf"
}
```

## Limitations

- The function has a 10MB file size limit
- The PDF.co API has its own rate limits based on your plan
