"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type PublicProfileData = {
  public_slug: string;
  display_name: string;
  headline?: string;
  crp: string;
  bio: string;
  photo_url: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  specialties: string[];
  services: Array<{
    id: string;
    title: string;
    description: string;
    durationMinutes: number;
    priceFormatted?: string;
  }>;
  modalities: string[];
  public_page_enabled: boolean;
  public_booking_enabled: boolean;
};

type SubscriptionData = {
  planId: string | null;
  planName: string;
  status: string;
  priceFormatted: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  nextBillingDate: string | null;
  features: {
    canUseLiveCopilot: boolean;
    canUsePublicPage: boolean;
    requiresOwnKeyForTranscription: boolean;
    hasCorporateAiAccess: boolean;
  };
};

type QuotaData = {
  currentUsage: number;
  maxAllowed: number;
  period: string;
};

type InvoiceData = {
  id: string;
  amount_cents: number;
  status: string;
  due_date?: string;
  paid_at?: string;
  created_at: string;
};

type SettingsData = {
  // Organization
  organization_name: string;
  cnpj: string;
  organization_phone: string;
  organization_email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  website: string;
  logo_url: string;

  // Therapist
  display_name: string;
  crp: string;
  therapist_email: string;
  therapist_phone: string;
  therapist_address: string;
  therapist_city: string;
  therapist_state: string;
  therapist_zip_code: string;
  bio: string;
  photo_url: string;
};

type AiStatus = {
  has_key: boolean;
  key_last4: string;
  key_added_at?: string;
};

type ModalState = {
  isOpen: boolean;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  onConfirm?: () => void;
};

const emptySettings: SettingsData = {
  organization_name: "",
  cnpj: "",
  organization_phone: "",
  organization_email: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  website: "",
  logo_url: "",
  display_name: "",
  crp: "",
  therapist_email: "",
  therapist_phone: "",
  therapist_address: "",
  therapist_city: "",
  therapist_state: "",
  therapist_zip_code: "",
  bio: "",
  photo_url: "",
};

const states = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(emptySettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("empresa");
  const [aiStatus, setAiStatus] = useState<AiStatus>({ has_key: false, key_last4: "" });
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [publicProfile, setPublicProfile] = useState<PublicProfileData>({
    public_slug: "",
    display_name: "",
    headline: "",
    crp: "",
    bio: "",
    photo_url: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    specialties: [],
    services: [],
    modalities: ["online"],
    public_page_enabled: true,
    public_booking_enabled: true,
  });
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newService, setNewService] = useState({
    title: "",
    description: "",
    durationMinutes: 50,
    priceFormatted: "",
  });
  const [hasPublicPageAccess, setHasPublicPageAccess] = useState<boolean>(false);
  const [savingPublicProfile, setSavingPublicProfile] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      setLoadingSubscription(true);
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription || null);
        setQuota(data.quota || null);
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de assinatura:", err);
    } finally {
      setLoadingSubscription(false);
    }
  }

  async function loadSettings() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || emptySettings);
        setLogoPreview(data.settings?.logo_url || "");
        setPhotoPreview(data.settings?.photo_url || "");
        setAiStatus({
          has_key: Boolean(data.ai?.has_key),
          key_last4: typeof data.ai?.key_last4 === "string" ? data.ai.key_last4 : "",
          key_added_at: typeof data.ai?.key_added_at === "string" ? data.ai.key_added_at : undefined,
        });
        setOpenaiApiKey("");

        try {
          const pubRes = await fetch("/api/settings/public-profile");
          if (pubRes.ok) {
            const pubData = await pubRes.json();
            if (pubData.profile) {
              setPublicProfile({
                public_slug: pubData.profile.public_slug || "",
                display_name: pubData.profile.display_name || "",
                headline: pubData.profile.headline || "",
                crp: pubData.profile.crp || "",
                bio: pubData.profile.bio || "",
                photo_url: pubData.profile.photo_url || "",
                phone: pubData.profile.phone || "",
                email: pubData.profile.email || "",
                city: pubData.profile.city || "",
                state: pubData.profile.state || "",
                specialties: Array.isArray(pubData.profile.specialties) ? pubData.profile.specialties : [],
                services: Array.isArray(pubData.profile.services) ? pubData.profile.services : [],
                modalities: Array.isArray(pubData.profile.modalities) ? pubData.profile.modalities : ["online"],
                public_page_enabled: pubData.profile.public_page_enabled ?? true,
                public_booking_enabled: pubData.profile.public_booking_enabled ?? true,
              });
            }
            setHasPublicPageAccess(Boolean(pubData.entitlement?.hasPublicPageAccess));
          }
        } catch {
          // Falha silenciosa no carregamento de perfil público
        }
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function updateField(field: keyof SettingsData, value: string) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function showModal(
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string,
    onConfirm?: () => void,
  ) {
    setModal({ isOpen: true, type, title, message, onConfirm });
  }

  function closeModal() {
    setModal((prev) => ({ ...prev, isOpen: false, onConfirm: undefined }));
  }

  async function removeKeyNow() {
    closeModal();
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...settings, remove_openai_key: true }),
      });
      if (res.ok) {
        await loadSettings();
        showModal("success", "Chave removida", "Sua chave OpenAI foi removida com sucesso.");
      } else {
        const json = (await res.json()) as { error?: string };
        showModal("error", "Erro", json.error || "Falha ao remover a chave.");
      }
    } catch {
      showModal("error", "Erro", "Falha ao remover a chave.");
    } finally {
      setIsSaving(false);
    }
  }

  async function loadImageFromFile(file: File) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = url;
      });
      return loaded;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function downscaleImage(file: File, type: "logo" | "photo") {
    if (!file.type.startsWith("image/")) return file;

    const img = await loadImageFromFile(file);
    const maxSide = type === "logo" ? 600 : 1200;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const quality = type === "logo" ? 0.85 : 0.8;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "photo"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimizedFile = await downscaleImage(file, type);
      const formData = new FormData();
      formData.append("file", optimizedFile);
      formData.append("type", type);

      const res = await fetch("/api/settings/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const urlField = type === "logo" ? "logo_url" : "photo_url";
        const previewField = type === "logo" ? setLogoPreview : setPhotoPreview;

        updateField(urlField, data.url);
        previewField(data.url);
      } else {
        showModal("error", "Erro", "Falha ao enviar imagem");
      }
    } catch (err) {
      showModal("error", "Erro", "Falha ao fazer upload da imagem");
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload: SettingsData & { openai_api_key?: string; remove_openai_key?: boolean } = {
        ...settings,
      };
      if (openaiApiKey.trim()) {
        payload.openai_api_key = openaiApiKey.trim();
      }
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showModal("success", "Sucesso", "Configurações salvas com sucesso");
        setOpenaiApiKey("");
        await loadSettings();
      } else {
        const json = (await res.json()) as { error?: string };
        showModal("error", "Erro", json.error || "Falha ao salvar configurações");
      }
    } catch (err) {
      showModal("error", "Erro", "Falha ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="patients-page">
        <div className="p-8 text-center text-muted-foreground">
          Carregando configurações...
        </div>
      </div>
    );
  }

  return (
    <div className="patients-page">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <svg
            className="w-8 h-8 text-teal-700"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19.14 12.94c.4-1.14.86-2.29 1.14-3.44 0-2.9-2.33-5.44-5.1-5.44-.49 0-.97.06-1.43.16-.43-2.17-2.47-3.82-4.91-3.82-2.88 0-5.25 2.34-5.25 5.25 0 .82.2 1.58.54 2.27.88-.22 1.79-.33 2.71-.33 1.92 0 3.79.46 5.43 1.31.94-.64 2.09-1 3.31-1 2.24 0 4.17 1.41 4.95 3.44-1.4 1.76-2.95 3.37-4.79 4.65h5.22c.79 0 1.43-.63 1.43-1.42 0-.36-.14-.68-.38-.94zM3.5 7.5c0 .83-.67 1.5-1.5 1.5S.5 8.33.5 7.5 1.17 6 2 6s1.5.67 1.5 1.5z"/>
          </svg>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        </div>
      </div>

      {error && (
        <Card className="admin-card border-red-200 bg-red-50 mb-6">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      )}

      {/* Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader className={`border-b-2 ${
              modal.type === "success" ? "border-green-500 bg-green-50" :
              modal.type === "error" ? "border-red-500 bg-red-50" :
              modal.type === "warning" ? "border-orange-500 bg-orange-50" :
              "border-blue-500 bg-blue-50"
            }`}>
              <div className="flex items-center gap-3">
                {modal.type === "success" && (
                  <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
                {modal.type === "error" && (
                  <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                )}
                {modal.type === "warning" && (
                  <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                )}
                {modal.type === "info" && (
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                )}
                <CardTitle className="text-lg">{modal.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-gray-700 mb-6">{modal.message}</p>
              <Button
                onClick={() => { modal.onConfirm ? modal.onConfirm() : closeModal(); }}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setCurrentTab("empresa")}
          className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
            currentTab === "empresa"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Dados da Empresa
        </button>
        <button
          onClick={() => setCurrentTab("profissional")}
          className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
            currentTab === "profissional"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Dados do Profissional
        </button>
        <button
          onClick={() => setCurrentTab("ia")}
          className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
            currentTab === "ia"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          IA
        </button>
        <button
          onClick={() => setCurrentTab("pagina_publica")}
          className={`px-4 py-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            currentTab === "pagina_publica"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <span>Página Pública</span>
          {hasPublicPageAccess && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Recurso Ativo" />
          )}
        </button>
        <button
          onClick={() => setCurrentTab("plano")}
          className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
            currentTab === "plano"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Meu plano
        </button>
      </div>

      <form onSubmit={saveSettings} className="space-y-6">
        {/* Aba Empresa */}
        {currentTab === "empresa" && (
          <div className="grid grid-cols-1 gap-6">
            <Card className="admin-card">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title">Logo da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-36 h-36 rounded-lg border border-gray-300 flex items-center justify-center bg-gray-50">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-gray-500">Sem logo</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "logo")}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      Selecionar Logo
                    </Button>
                    <p className="text-xs text-gray-500">PNG ou JPG até 2MB.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="admin-card">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title">Informações da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content space-y-4">
                <div className="form-grid">
                  <div className="field col-span-2">
                    <label className="label">Nome da Empresa *</label>
                    <Input
                      value={settings.organization_name}
                      onChange={(e) => updateField("organization_name", e.target.value)}
                      placeholder="Ex.: Clínica Saúde Mental"
                      className="control"
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label">CNPJ</label>
                    <Input
                      value={settings.cnpj}
                      onChange={(e) => updateField("cnpj", e.target.value)}
                      placeholder="Ex.: 00.000.000/0000-00"
                      className="control"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Email</label>
                    <Input
                      type="email"
                      value={settings.organization_email}
                      onChange={(e) => updateField("organization_email", e.target.value)}
                      placeholder="Ex.: contato@empresa.com"
                      className="control"
                    />
                  </div>
                  <div className="field col-span-2">
                    <label className="label">Telefone</label>
                    <Input
                      value={settings.organization_phone}
                      onChange={(e) => updateField("organization_phone", e.target.value)}
                      placeholder="Ex.: (11) 3000-0000"
                      className="control"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Website</label>
                    <Input
                      value={settings.website}
                      onChange={(e) => updateField("website", e.target.value)}
                      placeholder="Ex.: www.empresa.com"
                      className="control"
                    />
                  </div>
                </div>

                <div className="form-grid mt-6">
                  <div className="field col-span-2">
                    <label className="label">Endereço</label>
                    <Input
                      value={settings.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Ex.: Rua das Flores, 123"
                      className="control"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Cidade</label>
                    <Input
                      value={settings.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="Ex.: São Paulo"
                      className="control"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Estado</label>
                    <Select
                      value={settings.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      className="control"
                    >
                      <option value="">Selecione...</option>
                      {states.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="field">
                    <label className="label">CEP</label>
                    <Input
                      value={settings.zip_code}
                      onChange={(e) => updateField("zip_code", e.target.value)}
                      placeholder="Ex.: 01000-000"
                      className="control"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba Profissional */}
        {currentTab === "profissional" && (
          <div className="grid grid-cols-1 gap-6">
            <Card className="admin-card">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title">Foto do Profissional</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-36 h-36 rounded-lg border border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Photo Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-500">Sem foto</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "photo")}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      Selecionar Foto
                    </Button>
                    <p className="text-xs text-gray-500">PNG ou JPG até 2MB.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="admin-card">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title">Informações Profissionais</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content space-y-4">
                <div className="form-grid">
                  <div className="field col-span-2">
                    <label className="label">Nome Completo *</label>
                    <Input
                      value={settings.display_name}
                      onChange={(e) => updateField("display_name", e.target.value)}
                      placeholder="Ex.: Dra. Maria Silva"
                      className="control"
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label">CRP/CRM</label>
                    <Input
                      value={settings.crp}
                      onChange={(e) => updateField("crp", e.target.value)}
                      placeholder="Ex.: CRP 123456/SP"
                      className="control"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Email</label>
                    <Input
                      type="email"
                      value={settings.therapist_email}
                      onChange={(e) => updateField("therapist_email", e.target.value)}
                      placeholder="Ex.: maria@empresa.com"
                      className="control"
                    />
                  </div>
                  <div className="field col-span-2">
                    <label className="label">Telefone</label>
                    <Input
                      value={settings.therapist_phone}
                      onChange={(e) => updateField("therapist_phone", e.target.value)}
                      placeholder="Ex.: (11) 99999-9999"
                      className="control"
                    />
                  </div>
                </div>

                <div className="form-grid mt-6">
                  <div className="field col-span-2">
                    <label className="label">Endereço</label>
                    <Input
                      value={settings.therapist_address}
                      onChange={(e) => updateField("therapist_address", e.target.value)}
                      placeholder="Ex.: Rua das Flores, 123"
                      className="control"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Cidade</label>
                    <Input
                      value={settings.therapist_city}
                      onChange={(e) => updateField("therapist_city", e.target.value)}
                      placeholder="Ex.: São Paulo"
                      className="control"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Estado</label>
                    <Select
                      value={settings.therapist_state}
                      onChange={(e) => updateField("therapist_state", e.target.value)}
                      className="control"
                    >
                      <option value="">Selecione...</option>
                      {states.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="field">
                    <label className="label">CEP</label>
                    <Input
                      value={settings.therapist_zip_code}
                      onChange={(e) => updateField("therapist_zip_code", e.target.value)}
                      placeholder="Ex.: 01000-000"
                      className="control"
                    />
                  </div>
                </div>

                <div className="form-grid mt-6">
                  <div className="field col-span-4">
                    <label className="label">Biografia Profissional</label>
                    <textarea
                      value={settings.bio}
                      onChange={(e) => updateField("bio", e.target.value)}
                      placeholder="Descreva sua formação e experiência..."
                      className="control w-full p-3 border border-gray-300 rounded-md"
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba IA */}
        {currentTab === "ia" && (
          <div className="grid grid-cols-1 gap-6">
            <Card className="admin-card">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title">Chave OpenAI</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content space-y-4">
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  A chave fica salva no servidor e nao e exibida novamente. Sem chave, o sistema
                  continua funcionando com transcricao de texto.
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    aiStatus.has_key ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  }`}>
                    {aiStatus.has_key ? "Chave configurada" : "Chave nao configurada"}
                  </span>
                  {aiStatus.has_key && aiStatus.key_last4 ? (
                    <span className="text-xs text-slate-500">
                      Final: ****{aiStatus.key_last4}
                    </span>
                  ) : null}
                </div>

                <div className="field">
                  <label className="label">Nova chave OpenAI</label>
                  <Input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => {
                      setOpenaiApiKey(e.target.value);
                    }}
                    placeholder="sk-..."
                    className="control"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!aiStatus.has_key}
                    onClick={() => {
                      showModal(
                        "warning",
                        "Remover chave",
                        "A chave sera removida permanentemente. Deseja continuar?",
                        removeKeyNow,
                      );
                    }}
                  >
                    Remover chave
                  </Button>
                  <span className="text-xs text-slate-500" />
                </div>

              </CardContent>
            </Card>

            <Card className="admin-card border-emerald-200 bg-emerald-50">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title">Dica: como obter sua chave</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content space-y-3 text-sm text-emerald-900">
                <p>
                  A chave e gerada no painel da OpenAI. Com ela, voce controla seus custos e
                  consegue acompanhar o uso direto na sua conta.
                </p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Acesse o painel da OpenAI.</li>
                  <li>Crie ou selecione um projeto.</li>
                  <li>Vá em <strong>API Keys</strong> e gere uma nova chave.</li>
                  <li>Copie e cole a chave aqui nesta aba.</li>
                </ol>
                <div className="rounded-md border border-emerald-200 bg-white/80 px-3 py-2 text-xs text-emerald-800">
                  Link direto:{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-2"
                  >
                    https://platform.openai.com/api-keys
                  </a>
                </div>
                <p className="text-xs text-emerald-800">
                  Sem chave, o Cliniva continua funcionando com transcricao de texto (IA gratuita).
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba Página Pública Profissional */}
        {currentTab === "pagina_publica" && (
          <div className="grid grid-cols-1 gap-6">
            {!hasPublicPageAccess ? (
              <Card className="border border-amber-200 bg-amber-50/60 p-6 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shrink-0">
                    ★
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-1">
                      Recurso Exclusivo do Plano Profissional
                    </h3>
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                      A página pública individual com agendamento automático e chat inteligente com IA Corporativa Cliniva é exclusiva do plano <strong>Profissional (R$ 199,90/mês)</strong> ou durante o teste gratuito de 7 dias.
                    </p>
                    <a
                      href="/planos"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      Conhecer Plano Profissional
                    </a>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                <Card className="admin-card">
                  <CardHeader className="admin-card__header">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                        <div>
                          <CardTitle className="admin-card__title">Página Pública Individual</CardTitle>
                          <p className="text-xs text-slate-500 mt-1">Personalize sua apresentação, especialidades, serviços e agenda online.</p>
                        </div>
                        {publicProfile.public_slug ? (
                          <a
                            href={`/p/${publicProfile.public_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Visualizar Minha Página Pública
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="admin-card__content space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Seu Link Exclusivo *
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-3 py-2.5 rounded-lg border border-gray-200">
                          https://cliniva.com.br/p/
                        </span>
                        <Input
                          type="text"
                          value={publicProfile.public_slug}
                          onChange={(e) =>
                            setPublicProfile((prev: PublicProfileData) => ({
                              ...prev,
                              public_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                            }))
                          }
                          placeholder="seu-nome-profissional"
                          className="font-mono text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Use apenas letras minúsculas, números e hífens. Ex: <code>dra-cristiane</code>
                      </p>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={publicProfile.public_booking_enabled}
                          onChange={(e) =>
                            setPublicProfile((prev: PublicProfileData) => ({
                              ...prev,
                              public_booking_enabled: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span>Habilitar agendamento online diretamente na agenda Cliniva</span>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <Card className="admin-card">
                  <CardHeader className="admin-card__header">
                    <CardTitle className="admin-card__title">Informações de Exibição Pública</CardTitle>
                  </CardHeader>
                  <CardContent className="admin-card__content space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Nome de Exibição na Página *
                        </label>
                        <Input
                          type="text"
                          value={publicProfile.display_name}
                          onChange={(e) =>
                            setPublicProfile((prev: PublicProfileData) => ({ ...prev, display_name: e.target.value }))
                          }
                          placeholder="Ex: Dra. Cristiane Alcântara"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Registro Profissional (CRP / CRM)
                        </label>
                        <Input
                          type="text"
                          value={publicProfile.crp}
                          onChange={(e) =>
                            setPublicProfile((prev: PublicProfileData) => ({ ...prev, crp: e.target.value }))
                          }
                          placeholder="Ex: 06/123456"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Título ou Subtítulo Profissional (Headline)
                      </label>
                      <Input
                        type="text"
                        value={publicProfile.headline || ""}
                        onChange={(e) =>
                          setPublicProfile((prev: PublicProfileData) => ({ ...prev, headline: e.target.value }))
                        }
                        placeholder="Ex: Psicóloga Clínica especialista em Terapia Cognitivo-Comportamental"
                      />
                    </div>

                    {/* Ativação da Página e Modalidades */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          Status de Publicação
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={publicProfile.public_page_enabled}
                            onChange={(e) =>
                              setPublicProfile((prev: PublicProfileData) => ({
                                ...prev,
                                public_page_enabled: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="font-medium">
                            {publicProfile.public_page_enabled ? "Página Publicada e Visível" : "Página Oculta (Rascunho)"}
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          Modalidades de Atendimento
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={publicProfile.modalities.includes("online")}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPublicProfile((prev) => {
                                  const current = prev.modalities.filter((m) => m !== "online");
                                  if (checked) current.push("online");
                                  return { ...prev, modalities: current.length > 0 ? current : ["online"] };
                                });
                              }}
                              className="h-3.5 w-3.5 rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span>Online</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={publicProfile.modalities.includes("presencial")}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPublicProfile((prev) => {
                                  const current = prev.modalities.filter((m) => m !== "presencial");
                                  if (checked) current.push("presencial");
                                  return { ...prev, modalities: current.length > 0 ? current : ["presencial"] };
                                });
                              }}
                              className="h-3.5 w-3.5 rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span>Presencial</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Especialidades */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Especialidades e Foco Clínico
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {publicProfile.specialties.map((spec, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200"
                          >
                            {spec}
                            <button
                              type="button"
                              onClick={() => {
                                setPublicProfile((prev) => ({
                                  ...prev,
                                  specialties: prev.specialties.filter((_, i) => i !== idx),
                                }));
                              }}
                              className="text-teal-600 hover:text-red-600 font-bold ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={newSpecialty}
                          onChange={(e) => setNewSpecialty(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (newSpecialty.trim()) {
                                setPublicProfile((prev) => ({
                                  ...prev,
                                  specialties: [...prev.specialties, newSpecialty.trim()],
                                }));
                                setNewSpecialty("");
                              }
                            }
                          }}
                          placeholder="Adicionar especialidade (ex: Ansiedade, TDAH, TCC) e pressione Enter"
                          className="text-xs"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            if (newSpecialty.trim()) {
                              setPublicProfile((prev) => ({
                                ...prev,
                                specialties: [...prev.specialties, newSpecialty.trim()],
                              }));
                              setNewSpecialty("");
                            }
                          }}
                          className="shrink-0 text-xs"
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Foto de Perfil (URL da Imagem)
                      </label>
                      <Input
                        type="text"
                        value={publicProfile.photo_url}
                        onChange={(e) =>
                          setPublicProfile((prev: PublicProfileData) => ({ ...prev, photo_url: e.target.value }))
                        }
                        placeholder="https://exemplo.com/sua-foto.jpg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Você também pode usar a foto carregada na aba "Dados do Profissional".
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Apresentação e Biografia Profissional
                      </label>
                      <textarea
                        rows={5}
                        value={publicProfile.bio}
                        onChange={(e) =>
                          setPublicProfile((prev: PublicProfileData) => ({ ...prev, bio: e.target.value }))
                        }
                        placeholder="Descreva sua formação, abordagem clínica, público atendido e diferencial de acolhimento..."
                        className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        disabled={savingPublicProfile}
                        onClick={async () => {
                          setSavingPublicProfile(true);
                          try {
                            const res = await fetch("/api/settings/public-profile", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(publicProfile),
                            });
                            const result = await res.json();
                            if (!res.ok) {
                              throw new Error(result.error || "Falha ao salvar página pública.");
                            }
                            setModal({
                              isOpen: true,
                              type: "success",
                              title: "Sucesso!",
                              message: "Dados da página pública salvos com sucesso.",
                            });
                          } catch (err) {
                            setModal({
                              isOpen: true,
                              type: "error",
                              title: "Erro ao Salvar",
                              message: err instanceof Error ? err.message : "Erro desconhecido.",
                            });
                          } finally {
                            setSavingPublicProfile(false);
                          }
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                      >
                        {savingPublicProfile ? "Salvando Página Pública..." : "Salvar Dados da Página Pública"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Aba Meu plano */}
        {currentTab === "plano" && (
          <div className="grid grid-cols-1 gap-6">
            {loadingSubscription ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Carregando dados da assinatura...
              </div>
            ) : (
              <>
                {/* Resumo do Plano Atual */}
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-800 text-white p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs uppercase tracking-wider font-semibold text-teal-300">
                            Plano Atual
                          </span>
                          {subscription?.isTrial ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                              Trial 7 Dias ({subscription.trialDaysRemaining}d restantes)
                            </span>
                          ) : subscription?.status === "active" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-slate-950">
                              Ativo
                            </span>
                          ) : subscription?.status === "trial_expired" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                              Trial Expirado
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-600 text-white">
                              {subscription?.status || "Pendente"}
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                          Cliniva {subscription?.planName || "Essencial"}
                        </h2>
                        <p className="text-slate-300 text-sm mt-1">
                          {subscription?.isTrial
                            ? `Teste gratuito válido até ${subscription.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString("pt-BR") : "7 dias"}.`
                            : `${subscription?.priceFormatted || "R$ 59,90/mês"}`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <a
                          href="/planos"
                          className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md transition"
                        >
                          {subscription?.status === "trial_expired" || subscription?.status === "inactive"
                            ? "Assinar Agora"
                            : "Mudar de Plano"}
                        </a>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-6">
                    {/* Quota de IA Corporativa */}
                    {quota && (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-semibold text-slate-800">
                            Franquia de IA Corporativa ({subscription?.isTrial ? "Trial de 7 dias" : "Mês Vigente"})
                          </span>
                          <span className="font-bold text-slate-900">
                            {quota.currentUsage} / {quota.maxAllowed} análises
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full transition-all ${
                              quota.currentUsage >= quota.maxAllowed
                                ? "bg-red-500"
                                : quota.currentUsage / quota.maxAllowed > 0.8
                                ? "bg-amber-500"
                                : "bg-teal-600"
                            }`}
                            style={{
                              width: `${Math.min(100, Math.round((quota.currentUsage / Math.max(1, quota.maxAllowed)) * 100))}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {subscription?.isTrial
                            ? "O teste gratuito inclui 5 análises clínicas com IA Corporativa Cliniva durante todo o período."
                            : "As análises de notas com IA Corporativa Cliniva são renovadas mensalmente a cada ciclo de cobrança."}
                        </p>
                      </div>
                    )}

                    {/* Resumo de Recursos Disponíveis */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <span className="text-slate-500 block mb-1">Notas Clínicas</span>
                        <span className="font-bold text-slate-800">Ilimitadas</span>
                      </div>
                      <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <span className="text-slate-500 block mb-1">Copiloto e Áudio</span>
                        <span className="font-bold text-slate-800">
                          {subscription?.features.canUseLiveCopilot ? "Liberado (BYOK)" : "Não disponível"}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <span className="text-slate-500 block mb-1">Página Pública</span>
                        <span className="font-bold text-slate-800">
                          {subscription?.features.canUsePublicPage ? "Ativa com Agendamento" : "Exclusivo Profissional"}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg border border-slate-200 bg-white">
                        <span className="text-slate-500 block mb-1">Prontuários & Leitura</span>
                        <span className="font-bold text-emerald-600">Sempre Preservados</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Histórico de Faturas */}
                <Card className="admin-card">
                  <CardHeader className="admin-card__header">
                    <CardTitle className="admin-card__title">Histórico de Faturas</CardTitle>
                  </CardHeader>
                  <CardContent className="admin-card__content">
                    {invoices.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        Nenhuma fatura registrada no momento.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {invoices.map((inv) => (
                          <div key={inv.id} className="py-3 flex items-center justify-between text-sm">
                            <div>
                              <div className="font-semibold text-slate-900">
                                R$ {(inv.amount_cents / 100).toFixed(2).replace(".", ",")}
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                              </div>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                inv.status === "paid" || inv.status === "received"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : inv.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {inv.status === "paid" || inv.status === "received"
                                ? "Paga"
                                : inv.status === "pending"
                                ? "Pendente"
                                : inv.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Botões de Ação */}
        {currentTab !== "plano" && currentTab !== "pagina_publica" && (
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
