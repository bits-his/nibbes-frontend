import React, { useEffect, useState } from 'react';
import { Star, Quote, Loader2, Share2 } from 'lucide-react';
import { BACKEND_URL } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

interface FeedbackItem {
  id: string;
  name: string;
  rating: number;
  category: string | null;
  message: string;
  createdAt: string;
  userAvatar?: string | null;
  userName?: string;
  userPhone?: string | null;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(s => (
      <Star key={s} className={`w-4 h-4 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
    ))}
  </div>
);

const Avatar: React.FC<{ src?: string | null; name: string }> = ({ src, name }) => {
  if (src) return <img src={src} alt={name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md" />;
  return (
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#50BAA8] to-[#3A8E7D] flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-md">
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

// Wrap text for canvas
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Round rect helper
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function generateShareImage(fb: FeedbackItem): Promise<Blob> {
  const W = 1080, H = 1080; // Instagram/WhatsApp optimal square
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // === Background gradient ===
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#50BAA8');
  bg.addColorStop(1, '#3A8E7D');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // === Decorative circles ===
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(950, 120, 300, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(80, 980, 220, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(500, -60, 160, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.07;
  ctx.beginPath(); ctx.arc(200, 300, 120, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(850, 700, 100, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // === Top accent line ===
  const accent = ctx.createLinearGradient(60, 0, W - 60, 0);
  accent.addColorStop(0, 'transparent');
  accent.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  accent.addColorStop(0.7, 'rgba(255,255,255,0.6)');
  accent.addColorStop(1, 'transparent');
  ctx.fillStyle = accent;
  ctx.fillRect(60, 60, W - 120, 4);

  // === Brand name ===
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('NIBBLES FAST FOOD', 60, 120);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Customer Review', 60, 150);

  // === White card ===
  const cardX = 60, cardY = 180, cardW = W - 120, cardH = 580;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();

  // === Big quote mark ===
  ctx.font = 'bold 120px Georgia, serif';
  ctx.fillStyle = '#50BAA8';
  ctx.globalAlpha = 0.12;
  ctx.fillText('"', cardX + 30, cardY + 110);
  ctx.globalAlpha = 1;

  // === Stars ===
  const starY = cardY + 60;
  const starSize = 36;
  for (let i = 0; i < 5; i++) {
    ctx.font = `${starSize}px serif`;
    ctx.fillStyle = i < fb.rating ? '#F59E0B' : '#E5E7EB';
    ctx.fillText('★', cardX + 50 + i * (starSize + 6), starY + starSize);
  }

  // === Rating label ===
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#50BAA8';
  ctx.fillText(labels[fb.rating] || '', cardX + 50 + 5 * (starSize + 6) + 16, starY + starSize);

  // === Category pill ===
  if (fb.category) {
    const pillX = cardX + 50, pillY = starY + starSize + 20;
    ctx.font = '16px system-ui, sans-serif';
    const pillW = ctx.measureText(fb.category).width + 28;
    roundRect(ctx, pillX, pillY, pillW, 30, 15);
    ctx.fillStyle = '#EBF9F6';
    ctx.fill();
    ctx.fillStyle = '#50BAA8';
    ctx.fillText(fb.category, pillX + 14, pillY + 21);
  }

  // === Message ===
  ctx.font = '500 30px system-ui, sans-serif';
  ctx.fillStyle = '#1E293B';
  const msgLines = wrapText(ctx, `"${fb.message}"`, cardW - 100);
  const msgStartY = cardY + (fb.category ? 200 : 180);
  msgLines.slice(0, 7).forEach((line, i) => {
    ctx.fillText(line, cardX + 50, msgStartY + i * 44);
  });

  // === Divider ===
  const divY = cardY + cardH - 130;
  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 50, divY);
  ctx.lineTo(cardX + cardW - 50, divY);
  ctx.stroke();

  // === Avatar circle ===
  const avatarX = cardX + 50, avatarY = divY + 20, avatarR = 36;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR, 0, Math.PI * 2);
  ctx.clip();

  let avatarDrawn = false;
  if (fb.userAvatar) {
    const img = await loadImage(fb.userAvatar);
    if (img) {
      ctx.drawImage(img, avatarX, avatarY, avatarR * 2, avatarR * 2);
      avatarDrawn = true;
    }
  }
  if (!avatarDrawn) {
    const avatarGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarR * 2, avatarY + avatarR * 2);
    avatarGrad.addColorStop(0, '#50BAA8');
    avatarGrad.addColorStop(1, '#3A8E7D');
    ctx.fillStyle = avatarGrad;
    ctx.fillRect(avatarX, avatarY, avatarR * 2, avatarR * 2);
    ctx.restore();
    ctx.font = `bold ${avatarR}px system-ui, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText((fb.userName || fb.name).charAt(0).toUpperCase(), avatarX + avatarR, avatarY + avatarR + avatarR * 0.35);
    ctx.textAlign = 'left';
  } else {
    ctx.restore();
  }

  // === Name & date ===
  const nameX = avatarX + avatarR * 2 + 20;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#1E293B';
  ctx.fillText(fb.userName || fb.name, nameX, divY + 48);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(new Date(fb.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), nameX, divY + 76);

  // === Bottom section ===
  const bottomY = cardY + cardH + 50;

  // Verified badge
  roundRect(ctx, cardX, bottomY, 200, 44, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill();
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('✓ Verified Review', cardX + 20, bottomY + 28);

  // Website
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'right';
  ctx.fillText('nibblesfastfood.com', W - 60, bottomY + 28);
  ctx.textAlign = 'left';

  // === Bottom accent line ===
  ctx.fillStyle = accent;
  ctx.fillRect(60, H - 64, W - 120, 4);

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.92));
}

const CustomerFeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BACKEND_URL}/api/feedback`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setFeedbacks(data.data);
      } catch {
        toast({ title: 'Failed to load feedback', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const handleShare = async (fb: FeedbackItem) => {
    setSharingId(fb.id);
    try {
      const blob = await generateShareImage(fb);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nibbles-review-${(fb.userName || fb.name).replace(/\s+/g, '-')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: '✅ Image saved!', description: 'Upload it to Instagram, WhatsApp or any social media.' });
    } catch (e: any) {
      toast({ title: 'Failed to generate image', description: e?.message, variant: 'destructive' });
    } finally {
      setSharingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#50BAA8]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Customer Feedback</h1>
        <p className="text-gray-500 mt-1">{feedbacks.length} review{feedbacks.length !== 1 ? 's' : ''} received</p>
      </div>

      {feedbacks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Quote className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No feedback yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="flex flex-col items-center">
              <div className="w-full relative mb-4">
                <div className="absolute -top-3 -left-2 z-10 bg-[#50BAA8] rounded-full p-1.5 shadow">
                  <Quote className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 pt-5 flex flex-col justify-between overflow-hidden">
                  <p className="text-gray-700 text-sm leading-relaxed break-words">{fb.message}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <StarRating rating={fb.rating} />
                    {fb.category && (
                      <span className="text-xs text-[#50BAA8] bg-[#50BAA8]/10 px-2 py-0.5 rounded-full">{fb.category}</span>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45 shadow-sm" />
              </div>

              <div className="flex flex-col items-center mt-2 text-center">
                <Avatar src={fb.userAvatar} name={fb.userName || fb.name} />
                <p className="mt-2 font-semibold text-gray-800 text-sm">{fb.userName || fb.name}</p>
                {fb.userPhone && <p className="text-xs text-gray-400">{fb.userPhone}</p>}
                <p className="text-xs text-gray-300 mt-0.5">{new Date(fb.createdAt).toLocaleDateString()}</p>

                <button
                  onClick={() => handleShare(fb)}
                  disabled={sharingId === fb.id}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#50BAA8] border border-[#50BAA8]/30 rounded-full hover:bg-[#50BAA8]/10 transition-colors disabled:opacity-50"
                >
                  {sharingId === fb.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                  {sharingId === fb.id ? 'Generating...' : 'Share'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerFeedbackPage;
