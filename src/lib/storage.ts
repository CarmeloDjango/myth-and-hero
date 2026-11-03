import "server-only";

import { DeleteObjectsCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * 그림 저장소 (Neon Object Storage `drawings` 버킷, 비공개)
 *
 * - 자격 증명·주소·리전은 `neon deploy`가 넣어 주는 AWS 표준 환경 변수에서 읽습니다
 *   (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION).
 * - 브라우저는 저장소에 직접 접근하지 않습니다. 앱의 라우트 핸들러가 가족을 확인한 뒤 읽고 씁니다.
 * - 테스트에서는 setDrawingStore()로 메모리 저장소를 끼워 넣습니다.
 */
export type StoredObject = { body: Uint8Array; contentType: string };

export interface DrawingStore {
  put(key: string, body: Uint8Array | string, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  deleteMany(keys: string[]): Promise<void>;
}

const BUCKET = "drawings";

class S3DrawingStore implements DrawingStore {
  private client = new S3Client({ forcePathStyle: true }); // Neon은 path-style 주소가 필요합니다.

  async put(key: string, body: Uint8Array | string, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      if (!res.Body) return null;
      return { body: await res.Body.transformToByteArray(), contentType: res.ContentType ?? "application/octet-stream" };
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async deleteMany(keys: string[]) {
    if (!keys.length) return;
    await this.client.send(
      new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }),
    );
  }
}

let store: DrawingStore | undefined;

export function getDrawingStore(): DrawingStore {
  store ??= new S3DrawingStore();
  return store;
}

/** 테스트 전용: 저장소 바꿔 끼우기 */
export function setDrawingStore(next: DrawingStore | undefined) {
  store = next;
}

/** 저장소 키: 가족 → 영웅 → 버전별 파일 (새 그림마다 새 키라서 캐시가 꼬이지 않습니다) */
export function drawingKeys(familyId: string, heroId: string, version: string) {
  const base = `families/${familyId}/heroes/${heroId}/${version}`;
  return { png: `${base}/drawing.png`, strokes: `${base}/strokes.json` };
}
