"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

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

        {/* Aba Meu plano */}
        {currentTab === "plano" && (
          <div className="grid grid-cols-1 gap-6">
            <Card className="admin-card">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title">Faturas do Plano</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content">
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Em breve: listagem de faturas pagas e em aberto do tenant.
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Botões de Ação */}
        {currentTab !== "plano" && (
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
