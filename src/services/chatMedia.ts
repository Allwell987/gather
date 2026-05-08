import { supabase } from './supabase';
import { decodeBase64ToArrayBuffer } from './base64';

const CHAT_IMAGE_BUCKET = 'chat-images';
const CHAT_IMAGE_KIND = 'chat-image';

export type ParsedChatContent =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      imageUrl: string;
      caption?: string;
      fileName?: string;
      mimeType?: string;
    };

const getImageFileExtension = (contentType?: string | null) => {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
    case 'image/heif':
      return 'heic';
    default:
      return 'jpg';
  }
};

export const serializeChatImageMessage = ({
  imageUrl,
  caption,
  fileName,
  mimeType,
}: {
  imageUrl: string;
  caption?: string;
  fileName?: string;
  mimeType?: string;
}) => JSON.stringify({
  kind: CHAT_IMAGE_KIND,
  imageUrl,
  caption: caption?.trim() || undefined,
  fileName,
  mimeType,
});

export const parseChatMessageContent = (content: string): ParsedChatContent => {
  try {
    const parsed = JSON.parse(content) as {
      kind?: string;
      imageUrl?: string;
      caption?: string;
      fileName?: string;
      mimeType?: string;
    };

    if (parsed.kind === CHAT_IMAGE_KIND && typeof parsed.imageUrl === 'string' && parsed.imageUrl) {
      return {
        type: 'image',
        imageUrl: parsed.imageUrl,
        caption: parsed.caption,
        fileName: parsed.fileName,
        mimeType: parsed.mimeType,
      };
    }
  } catch {
    // plain text fallback
  }

  return { type: 'text', text: content };
};

export const uploadChatImage = async ({
  userId,
  groupId,
  base64,
  contentType,
  fileName,
  uploadKey,
}: {
  userId: string;
  groupId: string;
  base64: string;
  contentType?: string | null;
  fileName?: string | null;
  uploadKey?: string;
}) => {
  const normalizedContentType = contentType || 'image/jpeg';
  const fileExtension = getImageFileExtension(normalizedContentType);
  const safeFileName = fileName?.replace(/[^a-zA-Z0-9._-]/g, '-') || `chat-image.${fileExtension}`;
  const objectPath = `${groupId}/${userId}/${uploadKey ?? Date.now()}-${safeFileName}`;
  const fileData = decodeBase64ToArrayBuffer(base64);

  const { error: uploadError } = await supabase.storage.from(CHAT_IMAGE_BUCKET).upload(objectPath, fileData, {
    cacheControl: '3600',
    contentType: normalizedContentType,
    upsert: false,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(CHAT_IMAGE_BUCKET).getPublicUrl(objectPath);
  return `${data.publicUrl}?t=${Date.now()}`;
};

export const getChatImageUploadErrorMessage = (value?: string) => {
  const normalizedMessage = value?.trim().toLowerCase() ?? '';

  if (
    normalizedMessage.includes('bucket not found')
    || normalizedMessage.includes('not found')
    || normalizedMessage.includes('row-level security')
    || normalizedMessage.includes('permission')
  ) {
    return 'Chat image uploads need the Supabase storage bucket and policies from database/storage_chat_images.sql. Run that SQL, then try again.';
  }

  if (
    normalizedMessage.includes('network request failed')
    || normalizedMessage.includes('failed to fetch')
    || normalizedMessage.includes('network error')
    || normalizedMessage.includes('connection')
    || normalizedMessage.includes('timed out')
  ) {
    return 'Image messages need an internet connection before they can be sent.';
  }

  return 'We could not upload that image right now. Please try a smaller image or try again in a moment.';
};
