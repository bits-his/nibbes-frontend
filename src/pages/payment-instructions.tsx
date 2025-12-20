import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { CheckCircle, Copy, Upload, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function PaymentInstructions() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const orderId = new URLSearchParams(search).get("id");
  const orderNumber = new URLSearchParams(search).get("orderNumber");
  const amount = new URLSearchParams(search).get("amount");
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Order Created!</h1>
          <p className="text-muted-foreground">Order #{orderNumber}</p>
        </div>

        {/* Payment Instructions */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Complete Your Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Amount to Pay */}
            <div className="text-center p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Amount to Pay</p>
              <p className="text-4xl font-bold text-[#4EB5A4]">₦{parseFloat(amount || '0').toLocaleString()}</p>
            </div>

            {/* Bank Transfer Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Bank Transfer Details</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Bank Name</p>
                    <p className="font-semibold">Access Bank</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard("Access Bank", "Bank name")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-semibold text-lg">1234567890</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard("1234567890", "Account number")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Account Name</p>
                    <p className="font-semibold">Nibbles Kitchen Ltd</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard("Nibbles Kitchen Ltd", "Account name")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-semibold">{orderNumber}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(orderNumber || "", "Reference")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-blue-900">Payment Instructions:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Transfer the exact amount to the account above</li>
                <li>Use your order number as reference</li>
                <li>Keep your payment receipt</li>
                <li>Your order will be confirmed within 5-10 minutes</li>
                <li>You'll receive a notification when confirmed</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setLocation("/order-status?id=" + orderId)}
                className="flex-1 bg-[#4EB5A4] hover:bg-[#3fa391]"
              >
                Track Order
              </Button>
              <Button
                onClick={() => setLocation("/")}
                variant="outline"
                className="flex-1"
              >
                Back to Menu
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Need help? Contact us at <span className="font-semibold">support@nibbleskitchen.com</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
