
# PDF Extraction Edge Function

This Edge Function extracts text and detects the presence of images from PDF files. It uses Mozilla's pdf.js (via CDN) for PDF parsing.

## Setup

No API keys are required as we're using the open-source pdf.js library.

## Troubleshooting

If you encounter issues with the PDF extraction, check the following:

1. Make sure the PDF file is not corrupted and can be opened normally
2. Ensure the PDF file is not too large (keep under 10MB for best results)
3. For encrypted or password-protected PDFs, remove protection before uploading
4. Check the logs for detailed error information
5. Some highly formatted or scanned PDFs may not extract text correctly
6. If you see "Failed to send a request to the Edge Function" errors:
   - Make sure your network connection is stable
   - Try refreshing the page and uploading again
   - The edge function may be temporarily unavailable; try again later
   - Try using a different browser or network connection
   - If using a VPN, try disabling it temporarily

## CORS Issues

If you're seeing CORS-related errors:

1. The Edge Function may not have the correct CORS headers configured
2. There might be a network issue preventing the preflight request from completing
3. Try clearing your browser cache and cookies
4. Disable browser extensions that might be interfering with requests
5. Try a different browser to rule out browser-specific issues

## Network Connectivity Issues

If you're consistently seeing errors about sending requests:

1. Ensure your internet connection is stable
2. Try a different network if possible (switch from wifi to mobile data)
3. Clear your browser cache and cookies
4. Disable browser extensions that might be interfering with requests
5. Try a different browser
6. If your network has strict security policies, they might be blocking the requests

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
- Scanned PDFs (which are essentially images) will not yield text content unless they have been OCR'd

## Future Improvements

In the future, we may enhance this function to:
1. Extract actual image data from the PDFs
2. Preserve document structure and formatting better
3. Support additional PDF features like form fields, annotations, etc.
4. Add OCR capabilities for scanned documents
