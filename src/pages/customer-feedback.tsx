import React, { useEffect, useState } from 'react';
import { Star, Quote, Loader2 } from 'lucide-react';
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
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`w-4 h-4 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
      />
    ))}
  </div>
);

const Avatar: React.FC<{ src?: string | null; name: string }> = ({ src, name }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
      />
    );
  }
  return (
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#50BAA8] to-[#3A8E7D] flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-md">
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const CustomerFeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BACKEND_URL}/api/feedback`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setFeedbacks(data.data);
        else throw new Error(data.error);
      } catch (e: any) {
        toast({ title: 'Failed to load feedback', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

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
              {/* Thought bubble / quote box */}
              <div className="w-full relative mb-4">
                {/* Quote icon */}
                <div className="absolute -top-3 -left-2 z-10 bg-[#50BAA8] rounded-full p-1.5 shadow">
                  <Quote className="w-3.5 h-3.5 text-white fill-white" />
                </div>

                {/* Message box */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 pt-5 flex flex-col justify-between overflow-hidden">
                  <p className="text-gray-700 text-sm leading-relaxed break-words overflow-hidden">
                    {fb.message}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <StarRating rating={fb.rating} />
                    {fb.category && (
                      <span className="text-xs text-[#50BAA8] bg-[#50BAA8]/10 px-2 py-0.5 rounded-full">
                        {fb.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tail of thought bubble */}
                <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45 shadow-sm" />
              </div>

              {/* Customer info */}
              <div className="flex flex-col items-center mt-2 text-center">
                <Avatar src={fb.userAvatar} name={fb.userName || fb.name} />
                <p className="mt-2 font-semibold text-gray-800 text-sm">
                  {fb.userName || fb.name}
                </p>
                {fb.userPhone && (
                  <p className="text-xs text-gray-400">{fb.userPhone}</p>
                )}
                <p className="text-xs text-gray-300 mt-0.5">
                  {new Date(fb.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerFeedbackPage;
