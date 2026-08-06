import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { sql, dbEnabled } from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// 브라우저에서 Blob storage로 직접 업로드하는 방식(클라이언트 업로드) 전용 핸들러.
// 서버를 거쳐 파일 바이트를 전달하는 방식(예전 POST /api/admin/flyer-uploads)은
// Vercel 서버리스 함수의 요청 본문 크기 제한(~4.5MB)에 걸려 실제 임대안내문
// PDF(수 MB) 업로드가 항상 413으로 실패했음 - 그래서 이 방식으로 교체함.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, _clientPayload) => {
        if (!isAdminRequest(request)) throw new Error('unauthorized');
        return {
          allowedContentTypes: ['application/pdf'],
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Vercel Blob 인프라가 업로드 완료 후 이 콜백으로 알려줌(브라우저가 아니라
        // Vercel 서버가 호출 - 로컬 개발 서버로는 못 들어와서 배포본에서만 동작)
        if (!dbEnabled) return;
        let filename = blob.pathname;
        let vendorLabel = '';
        if (tokenPayload) {
          try {
            const parsed = JSON.parse(tokenPayload);
            filename = parsed.filename ?? filename;
            vendorLabel = parsed.vendorLabel ?? '';
          } catch {
            // tokenPayload가 JSON이 아니면 기본값 유지
          }
        }
        await sql!`
          INSERT INTO flyer_uploads (filename, vendor_label, blob_url, status)
          VALUES (${filename}, ${vendorLabel}, ${blob.url}, 'uploaded')
        `;
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error('[admin/flyer-uploads/upload-handler POST]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '업로드 실패' }, { status: 400 });
  }
}
