const { Ollama } = require('ollama');

async function run() {
  const ollama = new Ollama({ host: 'http://localhost:11434' });

  const result = await ollama.chat({
    model: 'mistral',
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  });

  console.log(result.message.content);
}

run();
