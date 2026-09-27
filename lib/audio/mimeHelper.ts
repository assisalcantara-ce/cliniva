/**
 * Lista prioritária de MIME types testados para gravação de áudio no navegador.
 * Ordem planejada para melhor compatibilidade com motores STT (Whisper, etc.).
 */
export const DEFAULT_PREFERRED_MIME_TYPES: string[] = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
];

/**
 * Detecta e seleciona o melhor MIME type suportado pelo navegador atual.
 * Utiliza MediaRecorder.isTypeSupported quando disponível, ou faz fallback seguro.
 */
export function getSupportedAudioMimeType(
  preferredTypes: string[] = DEFAULT_PREFERRED_MIME_TYPES
): string {
  if (
    typeof window === "undefined" ||
    typeof window.MediaRecorder === "undefined" ||
    typeof window.MediaRecorder.isTypeSupported !== "function"
  ) {
    // Fallback padrão seguro caso chamado fora de ambiente de browser ou sem API
    return "audio/webm";
  }

  for (const mime of preferredTypes) {
    try {
      if (window.MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    } catch {
      // Ignora erro em navegadores antigos ao testar codecs
    }
  }

  // Fallback padrão se nenhum formato preferencial for explicitamente aceito
  return "";
}

/**
 * Converte um Blob de áudio capturado no navegador para ArrayBuffer
 * para consumo direto pela camada de transporte / STTInput.
 */
export async function audioChunkToBuffer(chunkBlob: Blob): Promise<ArrayBuffer> {
  if (typeof chunkBlob.arrayBuffer === "function") {
    return await chunkBlob.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Falha ao converter Blob de áudio para ArrayBuffer."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Erro de leitura do FileReader."));
    reader.readAsArrayBuffer(chunkBlob);
  });
}

/**
 * Converte um Blob de áudio capturado no navegador para string Base64
 * para transmissão segura via WebSocket (AudioChunkMessage).
 */
export async function audioChunkToBase64(chunkBlob: Blob): Promise<string> {
  const buffer = await audioChunkToBuffer(chunkBlob);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

