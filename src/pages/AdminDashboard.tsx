import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { auth, db } from '../lib/firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Trash2, File, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const [config, setConfig] = useState<any>({});
  const [files, setFiles] = useState<{name: string, url: string, fullPath: string, size?: number, updated?: string}[]>([]);
  const [uploading, setUploading] = useState(false);
  
  useEffect(() => {
     loadConfig();
     loadFiles();
  }, []);

  const getAuthToken = async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Usuário não autenticado.');
    return token;
  };

  const loadFiles = async () => {
    try {
        const token = await getAuthToken();
        const res = await fetch('/api/admin/files', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Erro ao carregar arquivos (${res.status})`);
        }
        const data = await res.json();
        setFiles(data.files || []);
    } catch (e: any) {
        console.error("Error loading files", e);
        toast.error("Erro ao carregar arquivos: " + e.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;
      
      setUploading(true);
      try {
          const token = await getAuthToken();
          const formData = new FormData();
          for (let i = 0; i < selectedFiles.length; i++) {
              formData.append('files', selectedFiles[i]);
          }
          const res = await fetch('/api/admin/files', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData
          });
          if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data?.error?.message || data?.error || `Erro no upload (${res.status})`);
          }
          toast.success("Arquivos enviados com sucesso!");
          await loadFiles();
      } catch (err: any) {
          console.error("Upload error", err);
          toast.error("Erro no upload: " + err.message);
      } finally {
          setUploading(false);
          e.target.value = '';
      }
  };

  const handleDeleteFile = async (file: any) => {
      if (!confirm(`Excluir ${file.name}?`)) return;
      try {
          const token = await getAuthToken();
          const res = await fetch('/api/admin/files', {
              method: 'DELETE',
              headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ fullPath: file.fullPath })
          });
          if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || `Erro ao excluir (${res.status})`);
          }
          toast.success("Arquivo excluído.");
          await loadFiles();
      } catch (err: any) {
          console.error("Delete error", err);
          toast.error("Erro ao excluir: " + err.message);
      }
  };

  const loadConfig = async () => {
      try {
        const docRef = doc(db, 'adminConfig', 'settings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setConfig(docSnap.data());
        }
      } catch (e) {
          console.error(e);
      }
  };

  const saveConfig = async () => {
    try {
        const payload: any = {
            systemPrompt: config.systemPrompt,
            model: config.model,
            imageModel: config.imageModel,
            temperature: Number(config.temperature),
            maxTokens: Number(config.maxTokens)
        };

        const docRef = doc(db, 'adminConfig', 'settings');
        await setDoc(docRef, payload, { merge: true });
        
        toast.success("Configuração salva com sucesso!");
        loadConfig();
    } catch (e) {
        toast.error("Erro ao salvar configuração.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <Tabs defaultValue="config">
        <TabsList className="mb-6 bg-slate-100 p-1">
          <TabsTrigger value="config" className="rounded-md">🤖 Configuração IA</TabsTrigger>
          <TabsTrigger value="files" className="rounded-md">🗄️ Banco de Dados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="space-y-6">
          <div>
            <h3 className="font-medium mb-2 text-slate-900">Prompt / Instruções do Sistema</h3>
            <Textarea 
              value={config.systemPrompt || ''}
              onChange={(e) => setConfig({...config, systemPrompt: e.target.value})}
              className="font-mono text-sm min-h-[300px] resize-y bg-slate-50"
              placeholder="Você é um especialista em design de encartes..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="text-sm font-medium mb-1 block">Modelo de Chat</label>
                  <Input value={config.model || ''} onChange={e => setConfig({...config, model: e.target.value})} placeholder="gpt-4o" />
              </div>
              <div>
                  <label className="text-sm font-medium mb-1 block">Modelo de Imagem</label>
                  <Input value={config.imageModel || ''} onChange={e => setConfig({...config, imageModel: e.target.value})} placeholder="dall-e-3" />
              </div>
              <div>
                  <label className="text-sm font-medium mb-1 block">Temperatura</label>
                  <Input type="number" step="0.1" value={config.temperature || ''} onChange={e => setConfig({...config, temperature: e.target.value})} />
              </div>
              <div>
                  <label className="text-sm font-medium mb-1 block">Max Tokens</label>
                  <Input type="number" value={config.maxTokens || ''} onChange={e => setConfig({...config, maxTokens: e.target.value})} />
              </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={saveConfig}>💾 Salvar Configurações</Button>
          </div>
        </TabsContent>
        <TabsContent value="files" className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-lg text-slate-900">Banco de Dados de Conhecimento</h3>
                        <p className="text-sm text-slate-500">Documentos e imagens que a IA utiliza para gerar os encartes.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", files.length > 0 ? "bg-green-500" : "bg-slate-300")} />
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                {files.length > 0 ? "Conectado" : "Aguardando Arquivos"}
                            </span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={loadFiles} 
                            disabled={uploading}
                            className="h-8 w-8 p-0"
                        >
                            <Loader2 className={cn("h-4 w-4", uploading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="md:col-span-1">
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col items-center justify-center min-h-[240px]">
                            {uploading ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)] mb-4" />
                                    <p className="text-sm font-medium text-slate-600">Enviando arquivos...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white p-4 rounded-2xl border shadow-sm mb-4 text-[var(--color-primary)]">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-600 text-sm font-medium mb-1">Upload de Arquivos</p>
                                    <p className="text-slate-400 text-xs mb-6 px-4">Imagens, PDFs, Word ou Planilhas suportados</p>
                                    <label className="cursor-pointer">
                                       <input 
                                          type="file" 
                                          multiple 
                                          className="hidden" 
                                          onChange={handleFileUpload} 
                                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.xls,.txt"
                                       />
                                       <span className={cn(buttonVariants({ variant: "default", size: "sm" }), "px-6")}>
                                           Selecionar
                                       </span>
                                    </label>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 min-h-[240px]">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium text-slate-800 flex items-center gap-2">
                                    <File className="w-4 h-4 text-slate-400" />
                                    Arquivos na Base ({files.length})
                                </h4>
                                {files.length > 0 && (
                                    <Button variant="ghost" size="sm" onClick={loadFiles} className="h-8 text-xs">
                                        Atualizar
                                    </Button>
                                )}
                            </div>

                            {files.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <p className="text-sm">Nenhum arquivo enviado ainda.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {files.map(f => (
                                        <div key={f.name} className="flex flex-row items-center justify-between p-3 border border-white bg-white/80 rounded-xl shadow-sm hover:shadow-md hover:bg-white transition-all group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-[var(--color-primary-light)] group-hover:text-[var(--color-primary)] transition-colors">
                                                    <File className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <a href={f.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-700 truncate hover:text-[var(--color-primary)] transition-colors">
                                                        {f.name}
                                                    </a>
                                                    {f.size && (
                                                        <span className="text-[10px] text-slate-400">
                                                            {(Number(f.size) / 1024).toFixed(1)} KB • {f.updated ? new Date(f.updated).toLocaleDateString() : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteFile(f)} 
                                                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                title="Excluir arquivo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
