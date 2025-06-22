"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CreditCard, CheckCircle } from "lucide-react"
import { AuthService } from "@/lib/auth"
import { storageService, type Personnel, type Entity } from "@/lib/storage"
import { verifyTelebirr } from "@/lib/verifyTelebirr"

export default function SubscriptionRenewalPage() {
  const [user, setUser] = useState<Personnel | null>(null)
  const [entity, setEntity] = useState<Entity | null>(null)
  const [paymentReference, setPaymentReference] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [error, setError] = useState("")
  const router = useRouter()

  const SUBSCRIPTION_AMOUNT = 1000 // 1000 Birr per month
  const NEXUS_ACCOUNT = "111222" // Nexus platform account

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || !currentUser.entityId) {
      router.push("/login")
      return
    }

    setUser(currentUser)
    const userEntity = storageService.getEntityById(currentUser.entityId)
    setEntity(userEntity)
  }, [router])

  const handleVerifyPayment = async () => {
    if (!paymentReference.trim()) {
      setError("Please enter a payment reference number")
      return
    }

    setVerifying(true)
    setError("")
    setVerificationResult(null)

    try {
      const result = await verifyTelebirr(paymentReference)

      if (!result) {
        setError("Payment verification failed. Please check your reference number.")
        return
      }

      setVerificationResult(result)

      // Check if payment is valid
      const amountPaid = Number.parseFloat(result.settledAmount.replace(/[^\d.]/g, ""))
      const correctReceiver = result.creditedPartyAccountNo === NEXUS_ACCOUNT
      const isCompleted = result.transactionStatus === "Completed"

      if (!isCompleted) {
        setError("Payment is not completed. Please ensure the payment was successful.")
        return
      }

      if (!correctReceiver) {
        setError(
          `Payment was not made to the correct account. Expected: ${NEXUS_ACCOUNT}, Found: ${result.creditedPartyAccountNo}`,
        )
        return
      }

      if (amountPaid < SUBSCRIPTION_AMOUNT) {
        setError(`Insufficient payment amount. Required: ${SUBSCRIPTION_AMOUNT} Birr, Paid: ${amountPaid} Birr`)
        return
      }

      // Payment is valid, extend subscription
      if (entity) {
        const newExpiryDate = new Date()
        newExpiryDate.setMonth(newExpiryDate.getMonth() + 1)

        storageService.updateEntity(entity.id, {
          subscriptionExpiry: newExpiryDate.toISOString(),
        })

        // Redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      }
    } catch (error) {
      setError("An error occurred during verification. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  if (!user || !entity) {
    return <div>Loading...</div>
  }

  const isExpired = storageService.isEntitySubscriptionExpired(entity.id)
  const isVerified =
    verificationResult &&
    verificationResult.transactionStatus === "Completed" &&
    verificationResult.creditedPartyAccountNo === NEXUS_ACCOUNT &&
    Number.parseFloat(verificationResult.settledAmount.replace(/[^\d.]/g, "")) >= SUBSCRIPTION_AMOUNT

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Subscription Renewal Required
            </CardTitle>
            <CardDescription className="text-orange-700">
              {isExpired ? "Your subscription has expired" : "Your subscription is about to expire"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Entity:</span>
                <span className="font-medium">{entity.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Status:</span>
                <Badge variant={isExpired ? "destructive" : "secondary"}>{isExpired ? "Expired" : "Active"}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Expires:</span>
                <span className="font-medium">{new Date(entity.subscriptionExpiry).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Instructions
            </CardTitle>
            <CardDescription>Pay your monthly subscription fee to continue using Nexus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">{SUBSCRIPTION_AMOUNT} Birr</span>
                </div>
                <div className="flex justify-between">
                  <span>Receiver:</span>
                  <span className="font-medium">Nexus Platform</span>
                </div>
                <div className="flex justify-between">
                  <span>Account:</span>
                  <span className="font-medium">{NEXUS_ACCOUNT}</span>
                </div>
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="font-medium">Telebirr</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Steps:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Open your Telebirr app</li>
                <li>
                  Send {SUBSCRIPTION_AMOUNT} Birr to account {NEXUS_ACCOUNT}
                </li>
                <li>Note down the transaction reference number</li>
                <li>Enter the reference number below and click "Verify Payment"</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Payment Verification */}
        <Card>
          <CardHeader>
            <CardTitle>Verify Payment</CardTitle>
            <CardDescription>Enter your Telebirr transaction reference number to verify payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reference">Telebirr Reference Number</Label>
              <Input
                id="reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g., CFK21YPWYQ"
                disabled={verifying || isVerified}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {verificationResult && (
              <div
                className={`border rounded-lg p-4 ${isVerified ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}
              >
                <h4 className="font-medium mb-2">Verification Result:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Payer:</span>
                    <span>{verificationResult.payerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span>{verificationResult.settledAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Receiver:</span>
                    <span>{verificationResult.creditedPartyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span>{verificationResult.transactionStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{verificationResult.paymentDate}</span>
                  </div>
                </div>

                {isVerified && (
                  <div className="mt-3 flex items-center text-green-800">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">
                      Payment verified successfully! Redirecting to dashboard...
                    </span>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleVerifyPayment}
              disabled={verifying || isVerified || !paymentReference.trim()}
              className="w-full"
            >
              {verifying ? "Verifying..." : isVerified ? "Payment Verified" : "Verify Payment"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
