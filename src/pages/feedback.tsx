import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { BACKEND_URL } from '@/lib/queryClient';

const categories = ['Food Quality', 'Service', 'Delivery', 'App Experience', 'Other'];

const FeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState(user?.username || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' });
      return;
    }
    if (!message.trim()) {
      toast({ title: 'Please write your feedback', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ name, rating, category, message }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        throw new Error('Failed to submit');
      }
    } catch {
      toast({ title: 'Failed to submit feedback', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-[#50BAA8] mb-2">Thank you!</h2>
        <p className="text-gray-600 text-center max-w-sm">Your feedback has been submitted. We really appreciate you taking the time to share your thoughts.</p>
        <Button className="mt-6 bg-[#50BAA8] hover:bg-[#4aa595]" onClick={() => { setSubmitted(false); setRating(0); setMessage(''); setCategory(''); }}>
          Submit Another
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Share Your Feedback</h1>
        <p className="text-gray-500 mt-2">Help us improve by telling us about your experience</p>
      </div>

      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-[#50BAA8] to-[#3A8E7D] text-white rounded-t-lg">
          <CardTitle>How was your experience?</CardTitle>
          <CardDescription className="text-white/80">Your feedback helps us serve you better</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Star Rating */}
            <div className="text-center">
              <Label className="text-sm font-semibold text-gray-700 block mb-3">Overall Rating</Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        star <= (hovered || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 block mb-2">Category</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat === category ? '' : cat)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      category === cat
                        ? 'bg-[#50BAA8] text-white border-[#50BAA8]'
                        : 'border-gray-300 text-gray-600 hover:border-[#50BAA8] hover:text-[#50BAA8]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            {!user && (
              <div>
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Your Name (optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anonymous"
                  className="mt-1"
                />
              </div>
            )}

            {/* Message */}
            <div>
              <Label htmlFor="message" className="text-sm font-semibold text-gray-700">Your Feedback</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you loved or what we can improve..."
                rows={4}
                className="mt-1 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#50BAA8] to-[#3A8E7D] hover:from-[#4aa595] hover:to-[#357d6d] text-white py-3"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackPage;
