import { list, put } from '@vercel/blob';

const STORE_PATH = 'lindsey-cm/scheduled-posts.json';

export async function readSchedule() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const { blobs } = await list({ prefix: STORE_PATH, token });
  const match = blobs.find(b => b.pathname === STORE_PATH);
  if (!match) return { posts: [] };
  const res = await fetch(match.url);
  if (!res.ok) return { posts: [] };
  const data = await res.json();
  return { posts: Array.isArray(data.posts) ? data.posts : [] };
}

export async function writeSchedule(data) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  await put(STORE_PATH, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token,
  });
}
