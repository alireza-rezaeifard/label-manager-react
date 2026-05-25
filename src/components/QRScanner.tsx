import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';

export default function QRScanner({ onScan, onClose }: {
  onScan: (data: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let animId: number;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        scanFrame();
      } catch {
        setError('دوربین یافت نشد یا دسترسی به آن ممکن نیست');
        setScanning(false);
      }
    }

    function scanFrame() {
      if (!scanning) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animId = requestAnimationFrame(scanFrame);
        return;
      }

      const ctx = canvas.getContext('2d')!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        setScanning(false);
        stopCamera();
        if (onScan) onScan(code.data);
        return;
      }

      animId = requestAnimationFrame(scanFrame);
    }

    start();

    return () => {
      cancelAnimationFrame(animId);
      stopCamera();
    };
  }, [scanning, onScan, stopCamera]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>اسکن QR Code</h3>
          <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={onClose}></i>
        </div>

        {error ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="stat-icon danger" style={{ margin: '0 auto 1rem' }}>
              <i className="ti ti-camera-off"></i>
            </div>
            <p>{error}</p>
            <button className="btn btn-primary mt-4" onClick={onClose}>بستن</button>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} style={{ width: '100%', display: 'block' }} playsInline muted />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {scanning && (
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 200, height: 200, border: '2px solid var(--primary)',
                  borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)',
                  animation: 'fadeIn 0.5s',
                }} />
              )}
            </div>
            <p style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.7, fontSize: '0.9rem' }}>
              <i className="ti ti-scan"></i> دوربین را روی QR Code بگیرید
            </p>
            <button className="btn btn-outline w-100" onClick={onClose}>انصراف</button>
          </>
        )}
      </div>
    </div>
  );
}
