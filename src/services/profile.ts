import type { Session } from '@supabase/supabase-js';
import { getAuthRedirectUrl, supabase } from './supabase';
import type { UserProfile } from '../store/authStore';
import type { BibleVersion, Profile } from '../types/database';
import { decodeBase64ToArrayBuffer } from './base64';

type ProfileRow = Profile;

const PROFILE_SELECT = `
  id,
  email,
  full_name,
  avatar_url,
  address,
  birthday,
  church_id,
  role,
  is_verified,
  bible_version,
  reminder_time,
  streak_count,
  streak_last_date,
  push_token,
  created_at,
  updated_at
`;
const AVATAR_BUCKET = 'avatars';
const VERIFICATION_CERTIFICATE_BUCKET = 'verification-certificates';

const DEFAULT_BIBLE_VERSION: BibleVersion = 'niv';
const DEFAULT_REMINDER_TIME = '06:00';

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? '';
const normalizePhone = (value?: string | null) => value?.replace(/\D/g, '') ?? '';

const normalizeFullName = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const getAvatarFileExtension = (contentType?: string | null) => {
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

const getFileExtensionFromName = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');

  if (dotIndex <= 0 || dotIndex === normalized.length - 1) {
    return null;
  }

  const extension = normalized.slice(dotIndex + 1);
  const allowed = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

  return allowed.has(extension) ? extension : null;
};

const readImageDataAsArrayBuffer = async ({
  base64,
  uri,
}: {
  base64?: string | null;
  uri?: string | null;
}) => {
  const normalizedBase64 = base64?.trim();

  if (normalizedBase64) {
    return decodeBase64ToArrayBuffer(normalizedBase64);
  }

  const normalizedUri = uri?.trim();

  if (normalizedUri) {
    const response = await fetch(normalizedUri);

    if (!response.ok) {
      throw new Error(`Could not read selected image (${response.status}).`);
    }

    return response.arrayBuffer();
  }

  throw new Error('No image data was provided for upload.');
};

const getProfileEmail = (session: Session) => {
  const normalizedEmail = normalizeEmail(session.user.email);

  if (normalizedEmail) {
    return normalizedEmail;
  }

  const normalizedPhone = normalizePhone(session.user.phone);

  if (normalizedPhone) {
    return `phone-${normalizedPhone}@placeholder.local`;
  }

  return `${session.user.id}@placeholder.local`;
};

const toUserProfile = (
  session: Session,
  profile: ProfileRow | null,
  fallbackPushToken?: string | null
): UserProfile => ({
  id: session.user.id,
  email: normalizeEmail(session.user.email) || profile?.email || '',
  full_name: profile?.full_name ?? normalizeFullName(session.user.user_metadata?.full_name),
  avatar_url: profile?.avatar_url ?? null,
  church_id: profile?.church_id ?? null,
  role: (profile?.role as any) ?? 'member',
  is_verified: profile?.is_verified ?? Boolean(session.user.email_confirmed_at),
  address: profile?.address ?? null,
  birthday: profile?.birthday ?? null,
  bible_version: profile?.bible_version ?? DEFAULT_BIBLE_VERSION,
  reminder_time: profile?.reminder_time ?? DEFAULT_REMINDER_TIME,
  streak_count: profile?.streak_count ?? 0,
  streak_last_date: profile?.streak_last_date ?? null,
  push_token: fallbackPushToken ?? profile?.push_token ?? null,
  created_at: profile?.created_at ?? new Date().toISOString(),
  updated_at: profile?.updated_at ?? new Date().toISOString(),
});

export const toStoredUserProfile = (profile: ProfileRow): UserProfile => ({
  id: profile.id,
  email: normalizeEmail(profile.email),
  full_name: profile.full_name,
  avatar_url: profile.avatar_url ?? null,
  church_id: profile.church_id,
  role: profile.role as any,
  is_verified: profile.is_verified ?? false,
  address: profile.address ?? null,
  birthday: profile.birthday,
  bible_version: profile.bible_version ?? DEFAULT_BIBLE_VERSION,
  reminder_time: profile.reminder_time ?? DEFAULT_REMINDER_TIME,
  streak_count: profile.streak_count ?? 0,
  streak_last_date: profile.streak_last_date,
  push_token: profile.push_token ?? null,
  created_at: profile.created_at,
  updated_at: profile.updated_at,
});

export const fetchProfileById = async (userId: string) => {
  return supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle<ProfileRow>();
};

const buildInsertPayload = (session: Session, pushToken?: string | null) => ({
  id: session.user.id,
  email: getProfileEmail(session),
  full_name: normalizeFullName(session.user.user_metadata?.full_name),
  is_verified: Boolean(session.user.email_confirmed_at),
  birthday: null,
  bible_version: DEFAULT_BIBLE_VERSION,
  reminder_time: DEFAULT_REMINDER_TIME,
  streak_count: 0,
  push_token: pushToken ?? null,
});

export const ensureProfileForSession = async (
  session: Session,
  pushToken?: string | null
): Promise<UserProfile> => {
  const { data: existingProfile, error: fetchError } = await fetchProfileById(session.user.id);

  if (fetchError) {
    throw fetchError;
  }

  if (existingProfile) {
    const updates: Partial<ProfileRow> = {};
    const normalizedEmail = normalizeEmail(session.user.email);
    const normalizedFullName = normalizeFullName(session.user.user_metadata?.full_name);

    if (normalizedEmail && normalizedEmail !== existingProfile.email) {
      updates.email = normalizedEmail;
    }

    if (normalizedFullName && normalizedFullName !== (existingProfile.full_name ?? '')) {
      updates.full_name = normalizedFullName;
    }

    if (pushToken && pushToken !== existingProfile.push_token) {
      updates.push_token = pushToken;
    }

    if (Object.keys(updates).length === 0) {
      return toUserProfile(session, existingProfile, pushToken);
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updates as never)
      .eq('id', session.user.id)
      .select(PROFILE_SELECT)
      .single<ProfileRow>();

    if (updateError) {
      throw updateError;
    }

    return toUserProfile(session, updatedProfile, pushToken);
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from('profiles')
    .insert(buildInsertPayload(session, pushToken) as never)
    .select(PROFILE_SELECT)
    .single<ProfileRow>();

  if (!insertError && insertedProfile) {
    return toUserProfile(session, insertedProfile, pushToken);
  }

  if (insertError.code === '23505') {
    const { data: conflictedProfile, error: conflictFetchError } = await fetchProfileById(session.user.id);

    if (conflictFetchError) {
      throw conflictFetchError;
    }

    if (conflictedProfile) {
      return toUserProfile(session, conflictedProfile, pushToken);
    }
  }

  throw insertError;
};

export const updateProfile = async (
  userId: string,
  updates: Partial<Pick<ProfileRow, 'full_name' | 'avatar_url' | 'address' | 'birthday' | 'bible_version' | 'reminder_time'>>
): Promise<UserProfile> => {
  const payload: Partial<ProfileRow> = {};

  if ('full_name' in updates) {
    payload.full_name = normalizeFullName(updates.full_name) || null;
  }

  if ('avatar_url' in updates) {
    payload.avatar_url = typeof updates.avatar_url === 'string'
      ? updates.avatar_url.trim() || null
      : null;
  }

  if ('address' in updates) {
    payload.address = typeof updates.address === 'string'
      ? updates.address.trim() || null
      : null;
  }

  if ('birthday' in updates) {
    payload.birthday = typeof updates.birthday === 'string'
      ? updates.birthday.trim() || null
      : null;
  }

  if ('bible_version' in updates && updates.bible_version) {
    payload.bible_version = updates.bible_version;
  }

  if ('reminder_time' in updates && updates.reminder_time) {
    payload.reminder_time = updates.reminder_time.trim();
  }

  if (Object.keys(payload).length === 0) {
    const { data, error } = await fetchProfileById(userId);

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Profile not found.');
    }

    return toStoredUserProfile(data);
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      ...('full_name' in payload ? { full_name: payload.full_name } : {}),
      ...('avatar_url' in payload ? { avatar_url: payload.avatar_url } : {}),
    },
  });

  if (authError) {
    throw authError;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload as never)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return toStoredUserProfile(data);
};

export const updateAccountPassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }
};

export const updateAccountEmail = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  const { error } = await supabase.auth.updateUser(
    { email: normalizedEmail },
    { emailRedirectTo: getAuthRedirectUrl() }
  );

  if (error) {
    throw error;
  }

  return normalizedEmail;
};

export const getEmailUpdateErrorMessage = (value?: string) => {
  const normalizedMessage = value?.trim().toLowerCase() ?? '';

  if (normalizedMessage.includes('same email')) {
    return 'That is already your current email address.';
  }

  if (normalizedMessage.includes('invalid email')) {
    return 'Enter a valid email address.';
  }

  if (normalizedMessage.includes('already registered')) {
    return 'That email is already linked to another account.';
  }

  return 'We could not start your email change right now. Please try again in a moment.';
};

export const uploadProfileAvatar = async ({
  userId,
  base64,
  uri,
  contentType,
}: {
  userId: string;
  base64?: string | null;
  uri?: string | null;
  contentType?: string | null;
}) => {
  const normalizedContentType = contentType || 'image/jpeg';
  const fileExtension = getAvatarFileExtension(normalizedContentType);
  const objectPath = `${userId}/avatar.${fileExtension}`;
  const fileData = await readImageDataAsArrayBuffer({ base64, uri });

  const { error: uploadError } = await supabase
    .storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, fileData, {
      cacheControl: '3600',
      contentType: normalizedContentType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase
    .storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(objectPath);

  const cacheBustedUrl = `${data.publicUrl}?t=${Date.now()}`;

  return cacheBustedUrl;
};

export const uploadVerificationCertificate = async ({
  userId,
  base64,
  uri,
  contentType,
  fileName,
}: {
  userId: string;
  base64?: string | null;
  uri?: string | null;
  contentType?: string | null;
  fileName?: string | null;
}) => {
  const normalizedContentType = contentType || 'image/jpeg';
  const fileExtension = getFileExtensionFromName(fileName) || getAvatarFileExtension(normalizedContentType);
  const objectPath = `${userId}/${Date.now()}-certificate.${fileExtension}`;
  const fileData = await readImageDataAsArrayBuffer({ base64, uri });

  const { error: uploadError } = await supabase
    .storage
    .from(VERIFICATION_CERTIFICATE_BUCKET)
    .upload(objectPath, fileData, {
      cacheControl: '3600',
      contentType: normalizedContentType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  return {
    bucketId: VERIFICATION_CERTIFICATE_BUCKET,
    objectPath,
  };
};

export const getAvatarUploadErrorMessage = (value?: string) => {
  const normalizedMessage = value?.trim().toLowerCase() ?? '';

  if (
    normalizedMessage.includes('bucket not found')
    || normalizedMessage.includes('not found')
    || normalizedMessage.includes('row-level security')
    || normalizedMessage.includes('permission')
  ) {
    return 'Avatar uploads need the Supabase storage bucket and policies from database/storage_avatars.sql. Run that SQL, then try again.';
  }

  return 'We could not upload that photo right now. Please try a smaller image or try again in a moment.';
};

export const getVerificationCertificateUploadErrorMessage = (value?: string) => {
  const normalizedMessage = value?.trim().toLowerCase() ?? '';

  if (
    normalizedMessage.includes('bucket not found')
    || normalizedMessage.includes('not found')
    || normalizedMessage.includes('row-level security')
    || normalizedMessage.includes('permission')
  ) {
    return 'Certificate uploads need the Supabase storage bucket and policies from database/storage_verification_certificates.sql. Run that SQL, then try again.';
  }

  return 'We could not upload your certificate right now. Please try again with a clearer photo.';
};
