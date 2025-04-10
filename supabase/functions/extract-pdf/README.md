
# PDF Extraction Edge Function

This Edge Function extracts text and detects the presence of images from PDF files. It uses pdf.js, an open-source PDF library developed by Mozilla.

## Setup

No API keys are required as we're using the open-source pdf.js library.

## Usage

This function accepts a PDF file through a FormData POST request and returns:

- Extracted text content
- Information about whether images are present (but doesn't extract the actual images)
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
  "images": ["PDF contains images, but direct extraction is not supported in this version."],
  "pages": 5,
  "filename": "document.pdf"
}
```

## Limitations

- The function has a size limit determined by Supabase Edge Functions (typically around 6MB)
- Image extraction is limited to detecting the presence of images, not extracting the actual image data
- Complex PDF documents may not have all text properly extracted

## Future Improvements

In the future, we may enhance this function to:
1. Extract actual image data from the PDFs
2. Preserve document structure and formatting better
3. Support additional PDF features like form fields, annotations, etc.
