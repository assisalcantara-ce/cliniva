import "server-only";

const ASAAS_BASE_URL = "https://api.asaas.com/v3";

function getApiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("Missing env var: ASAAS_API_KEY");
  return key;
}

async function asaasRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: object
): Promise<T> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": getApiKey(),
      "User-Agent": "Cliniva/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asaas ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export function asaasGet<T>(path: string): Promise<T> {
  return asaasRequest<T>("GET", path);
}

// ─── Customers ──────────────────────────────────────────────────────────────

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
}

export function createAsaasCustomer(input: CreateCustomerInput): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>("POST", "/customers", input);
}

// ─── Payments ───────────────────────────────────────────────────────────────

export type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

export interface CreditCard {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
  postalCode?: string;
}

export interface CreatePaymentInput {
  customer: string; // Asaas customer ID
  billingType: BillingType;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  creditCard?: CreditCard;
  creditCardHolderInfo?: CreditCardHolderInfo;
  remoteIp?: string;
}

export interface AsaasPayment {
  id: string;
  status: string; // PENDING, CONFIRMED, RECEIVED, OVERDUE, etc.
  billingType: BillingType;
  value: number;
  dueDate: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
  transactionReceiptUrl?: string;
}

export function createAsaasPayment(input: CreatePaymentInput): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>("POST", "/payments", input);
}

// ─── PIX QR Code ────────────────────────────────────────────────────────────

export interface PixQrCode {
  encodedImage: string; // base64 PNG
  payload: string;      // copia-e-cola string
  expirationDate: string;
}

export function getPixQrCode(paymentId: string): Promise<PixQrCode> {
  return asaasRequest<PixQrCode>("GET", `/payments/${paymentId}/pixQrCode`);
}

// ─── Subscription (cobrança recorrente) ─────────────────────────────────────

export interface CreateSubscriptionInput {
  customer: string;
  billingType: BillingType;
  value: number;
  nextDueDate: string; // YYYY-MM-DD — data da primeira cobrança
  cycle: "MONTHLY";
  description: string;
  creditCard?: CreditCard;
  creditCardHolderInfo?: CreditCardHolderInfo;
  remoteIp?: string;
}

export interface AsaasSubscription {
  id: string;
  status: string;
  billingType: BillingType;
  value: number;
  nextDueDate: string;
  cycle: string;
}

export function createAsaasSubscription(
  input: CreateSubscriptionInput
): Promise<AsaasSubscription> {
  return asaasRequest<AsaasSubscription>("POST", "/subscriptions", input);
}

// ─── Webhook event types (subset) ──────────────────────────────────────────

export type AsaasWebhookEvent =
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DELETED"
  | "PAYMENT_REFUNDED"
  | "SUBSCRIPTION_INACTIVATED";

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent;
  payment?: AsaasPayment & { subscription?: string };
  subscription?: AsaasSubscription;
}
