
// OpenAI Stream Utility
export async function OpenAIStream(response: Response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  
  let buffer = '';
  let content = '';
  
  async function read() {
    if (!reader) {
      return encoder.encode('data: [DONE]\n\n');
    }
    
    const { value, done } = await reader.read();
    
    if (done) {
      // Return a stream end marker
      return encoder.encode('data: [DONE]\n\n');
    }
    
    // Decode the chunk and add it to our buffer
    buffer += decoder.decode(value, { stream: true });
    
    // Process any complete messages in the buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep any incomplete line in the buffer
    
    const chunks = [];
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          // Stream finished
          chunks.push(encoder.encode('data: [DONE]\n\n'));
        } else {
          try {
            const json = JSON.parse(data);
            const chunk = json.choices[0]?.delta?.content || '';
            if (chunk) {
              content += chunk;
              chunks.push(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            }
          } catch (error) {
            console.error('Error parsing stream data:', error);
          }
        }
      }
    }
    
    return chunks.length > 0 
      ? encoder.encode(chunks.map(c => decoder.decode(c)).join(''))
      : encoder.encode('');
  }
  
  return new ReadableStream({
    async pull(controller) {
      try {
        const chunk = await read();
        if (chunk.length === 0) {
          // Wait briefly for more data
          await new Promise(resolve => setTimeout(resolve, 100));
          const nextChunk = await read();
          if (nextChunk.length > 0) {
            controller.enqueue(nextChunk);
          }
        } else {
          controller.enqueue(chunk);
        }
      } catch (error) {
        console.error('Stream reading error:', error);
        controller.error(error);
      }
    },
    cancel() {
      reader?.cancel();
    }
  });
}
