import React, { useState, useEffect } from "react"
import {
  DollarSign,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  RefreshCw,
  Bell,
  CreditCard,
  Wallet,
  MessageCircle,
  Users,
  Store,
  LogOut,
  Lock,
  Mail,
  UserPlus,
} from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ""
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

// Função auxiliar para extrair apenas o ID de links do Google Drive
const extrairIdGoogleDrive = (urlOuId) => {
  if (!urlOuId) return ""
  const limpo = urlOuId.trim()
  if (!limpo.includes("/") && !limpo.includes(".")) {
    return limpo
  }
  const regex = /(?:\/d\/|id=|\/open\?id=)([a-zA-Z0-9_-]+)/
  const match = limpo.match(regex)
  if (match && match[1]) {
    return match[1]
  }
  const partes = limpo.split("/")
  const indexD = partes.indexOf("d")
  if (indexD !== -1 && partes[indexD + 1]) {
    return partes[indexD + 1]
  }
  return limpo
}

// Formata para URL direta de imagem do Google Drive se houver ID
const formatarUrlFoto = (urlOuId) => {
  if (!urlOuId) return ""
  const id = extrairIdGoogleDrive(urlOuId)
  if (id.length > 20 && !id.startsWith("http")) {
    return `https://drive.google.com/uc?id=${id}`
  }
  return urlOuId
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Estados de Autenticação por E-mail/Senha
  const [isRegistering, setIsRegistering] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [passwordInput, setPasswordInput] = useState("")
  const [authError, setAuthError] = useState("")

  const [abaAtiva, setAbaAtiva] = useState("recebimentos")

  const [recebimentos, setRecebimentos] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [credores, setCredores] = useState([])

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [filtroCliente, setFiltroCliente] = useState("todos")

  // Modais
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({
    vencimento: "",
    motivo_atraso: "",
  })

  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddPagamentoModal, setShowAddPagamentoModal] = useState(false)
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [showCredorModal, setShowCredorModal] = useState(false)

  // Edição
  const [editingClienteId, setEditingClienteId] = useState(null)
  const [editClienteData, setEditClienteData] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    endereco: "",
    foto_url: "",
  })

  const [editingCredorId, setEditingCredorId] = useState(null)
  const [editCredorData, setEditCredorData] = useState({
    nome: "",
    whatsapp: "",
    categoria: "Comida",
    foto_url: "",
  })

  // Novo Recebimento
  const [newItem, setNewItem] = useState({
    cliente_id: "",
    descricao: "",
    valorTotal: "",
    parcelas: "1",
    vencimentoInicial: new Date().toISOString().split("T")[0],
    motivo_atraso: "",
  })

  const [newCliente, setNewCliente] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    endereco: "",
    foto_url: "",
  })
  const [newCredor, setNewCredor] = useState({
    nome: "",
    whatsapp: "",
    categoria: "Comida",
    foto_url: "",
  })

  const [newPagamento, setNewPagamento] = useState({
    credor_id: "",
    valorTotal: "",
    parcelas: "1",
    vencimentoInicial: new Date().toISOString().split("T")[0],
    anotacoes: "",
  })

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (session) fetchDados()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchDados()
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLoginGoogle = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
    if (error) alert("Erro ao autenticar com Google: " + error.message)
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setAuthError("")
    if (!supabase) return

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({
        email: emailInput,
        password: passwordInput,
      })
      if (error) {
        setAuthError(error.message)
      } else {
        alert(
          "Conta criada com sucesso! Verifique seu e-mail caso seja necessário confirmar o cadastro.",
        )
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      })
      if (error) {
        setAuthError("E-mail ou senha incorretos.")
      }
    }
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
  }

  const fetchDados = async () => {
    setLoading(true)
    try {
      const { data: cliData } = await supabase
        .from("clientes_cadastrados")
        .select("*")
        .order("nome")
      setClientes(cliData || [])

      const { data: credData } = await supabase
        .from("credores_cadastrados")
        .select("*")
        .order("nome")
      setCredores(credData || [])

      const { data: recData } = await supabase
        .from("recebimentos")
        .select("*")
        .order("vencimento", { ascending: true })
      setRecebimentos(recData || [])

      const { data: pagData } = await supabase
        .from("pagamentos")
        .select("*")
        .order("vencimento", { ascending: true })
      setPagamentos(pagData || [])
    } catch (err) {
      console.error("Erro ao buscar dados:", err.message)
      setErrorMsg("Erro ao carregar dados do Supabase.")
    } finally {
      setLoading(false)
    }
  }

  const getStatusItem = (item) => {
    if (item.status === "pago") return "pago"
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const [anoVenc, mesVenc, diaVenc] = item.vencimento.split("-").map(Number)
    const dataVenc = new Date(anoVenc, mesVenc - 1, diaVenc)

    if (dataVenc < hoje) return "atrasado"
    if (
      dataVenc.getFullYear() === hoje.getFullYear() &&
      dataVenc.getMonth() === hoje.getMonth()
    )
      return "mes_atual"
    return "futuro"
  }

  const toggleStatusRecebimento = async (id, currentStatus) => {
    const novoStatus = currentStatus === "pago" ? "pendente" : "pago"
    if (supabase)
      await supabase
        .from("recebimentos")
        .update({ status: novoStatus })
        .eq("id", id)
    setRecebimentos(
      recebimentos.map((item) =>
        item.id === id ? { ...item, status: novoStatus } : item,
      ),
    )
  }

  const deleteRecebimento = async (id) => {
    if (!confirm("Deseja excluir este lançamento?")) return
    if (supabase) await supabase.from("recebimentos").delete().eq("id", id)
    setRecebimentos(recebimentos.filter((item) => item.id !== id))
  }

  const startEditRecebimento = (item) => {
    setEditingId(item.id)
    setEditData({
      vencimento: item.vencimento,
      motivo_atraso: item.motivo_atraso || "",
    })
  }

  const saveEditRecebimento = async (id) => {
    if (supabase) {
      await supabase
        .from("recebimentos")
        .update({
          vencimento: editData.vencimento,
          motivo_atraso: editData.motivo_atraso,
        })
        .eq("id", id)
    }
    setRecebimentos(
      recebimentos.map((item) =>
        item.id === id
          ? {
              ...item,
              vencimento: editData.vencimento,
              motivo_atraso: editData.motivo_atraso,
            }
          : item,
      ),
    )
    setEditingId(null)
  }

  const enviarWhatsAppCliente = (clienteNome, descricao, valor, vencimento) => {
    const cli = clientes.find((c) => c.nome === clienteNome)
    if (!cli || !cli.whatsapp) {
      alert(
        `O cliente ${clienteNome} não possui WhatsApp cadastrado na aba Clientes.`,
      )
      return
    }
    const foneLimpo = cli.whatsapp.replace(/\D/g, "")
    const dataFormatada = vencimento.split("-").reverse().join("/")
    const textoMensagem = `Olá ${cli.nome}, lembrete sobre o acerto referente a ${descricao}.\n\nValor da Parcela: R$ ${Number(valor).toFixed(2)}\nVencimento: ${dataFormatada}\n\nQualquer dúvida estou à disposição!`
    window.open(
      `https://wa.me/55${foneLimpo}?text=${encodeURIComponent(textoMensagem)}`,
      "_blank",
    )
  }

  const handleAddCliente = async (e) => {
    e.preventDefault()
    const clienteParaSalvar = {
      ...newCliente,
      foto_url: formatarUrlFoto(newCliente.foto_url),
      user_id: session.user.id,
    }

    if (supabase) {
      const { data, error } = await supabase
        .from("clientes_cadastrados")
        .insert([clienteParaSalvar])
        .select()
      if (error) {
        alert("Erro: " + error.message)
        return
      }
      if (data) setClientes([...clientes, data[0]])
    }
    setShowClienteModal(false)
    setNewCliente({
      nome: "",
      whatsapp: "",
      email: "",
      endereco: "",
      foto_url: "",
    })
  }

  const deleteCliente = async (id) => {
    if (!confirm("Deseja excluir este cliente?")) return
    if (supabase)
      await supabase.from("clientes_cadastrados").delete().eq("id", id)
    setClientes(clientes.filter((c) => c.id !== id))
  }

  const startEditCliente = (cli) => {
    setEditingClienteId(cli.id)
    setEditClienteData({
      nome: cli.nome,
      whatsapp: cli.whatsapp || "",
      email: cli.email || "",
      endereco: cli.endereco || "",
      foto_url: cli.foto_url || "",
    })
  }

  const saveEditCliente = async (id) => {
    const dadosAtualizados = {
      ...editClienteData,
      foto_url: formatarUrlFoto(editClienteData.foto_url),
    }
    if (supabase)
      await supabase
        .from("clientes_cadastrados")
        .update(dadosAtualizados)
        .eq("id", id)
    setClientes(
      clientes.map((c) => (c.id === id ? { ...c, ...dadosAtualizados } : c)),
    )
    setEditingClienteId(null)
  }

  const handleAddCredor = async (e) => {
    e.preventDefault()
    const credorParaSalvar = {
      ...newCredor,
      foto_url: formatarUrlFoto(newCredor.foto_url),
      user_id: session.user.id,
    }

    if (supabase) {
      const { data, error } = await supabase
        .from("credores_cadastrados")
        .insert([credorParaSalvar])
        .select()
      if (error) {
        alert("Erro: " + error.message)
        return
      }
      if (data) setCredores([...credores, data[0]])
    }
    setShowCredorModal(false)
    setNewCredor({ nome: "", whatsapp: "", categoria: "Comida", foto_url: "" })
  }

  const deleteCredor = async (id) => {
    if (!confirm("Deseja excluir este credor?")) return
    if (supabase)
      await supabase.from("credores_cadastrados").delete().eq("id", id)
    setCredores(credores.filter((c) => c.id !== id))
  }

  const startEditCredor = (cred) => {
    setEditingCredorId(cred.id)
    setEditCredorData({
      nome: cred.nome,
      whatsapp: cred.whatsapp || "",
      categoria: cred.categoria || "Comida",
      foto_url: cred.foto_url || "",
    })
  }

  const saveEditCredor = async (id) => {
    const dadosAtualizados = {
      ...editCredorData,
      foto_url: formatarUrlFoto(editCredorData.foto_url),
    }
    if (supabase)
      await supabase
        .from("credores_cadastrados")
        .update(dadosAtualizados)
        .eq("id", id)
    setCredores(
      credores.map((c) => (c.id === id ? { ...c, ...dadosAtualizados } : c)),
    )
    setEditingCredorId(null)
  }

  const handleAddRecebimento = async (e) => {
    e.preventDefault()
    const clienteObj = clientes.find((c) => c.id === newItem.cliente_id)
    if (!clienteObj) {
      alert("Selecione um cliente válido.")
      return
    }

    const qtdParcelas = parseInt(newItem.parcelas) || 1
    const valorTotalNum = parseFloat(newItem.valorTotal) || 0
    const valorParcela = Number((valorTotalNum / qtdParcelas).toFixed(2))

    const novosItens = []
    let dataBase = new Date(newItem.vencimentoInicial + "T00:00:00")

    for (let i = 1; i <= qtdParcelas; i++) {
      const dataVencStr = dataBase.toISOString().split("T")[0]
      novosItens.push({
        cliente: clienteObj.nome,
        descricao: `${newItem.descricao} (${i}x${qtdParcelas})`,
        valor: valorParcela,
        vencimento: dataVencStr,
        status: "pendente",
        motivo_atraso: newItem.motivo_atraso,
        user_id: session.user.id,
      })
      dataBase.setMonth(dataBase.getMonth() + 1)
    }

    if (supabase) {
      const { data, error } = await supabase
        .from("recebimentos")
        .insert(novosItens)
        .select()
      if (error) {
        alert("Erro: " + error.message)
        return
      }
      if (data) setRecebimentos([...recebimentos, ...data])
    } else {
      const comIds = novosItens.map((it, idx) => ({
        id: Date.now().toString() + idx,
        ...it,
      }))
      setRecebimentos([...recebimentos, ...comIds])
    }

    setShowAddModal(false)
    setNewItem({
      cliente_id: "",
      descricao: "",
      valorTotal: "",
      parcelas: "1",
      vencimentoInicial: new Date().toISOString().split("T")[0],
      motivo_atraso: "",
    })
  }

  const handleAddPagamento = async (e) => {
    e.preventDefault()
    const credorObj = credores.find((c) => c.id === newPagamento.credor_id)
    if (!credorObj) {
      alert("Selecione uma loja ou credor válido.")
      return
    }

    const qtdParcelas = parseInt(newPagamento.parcelas) || 1
    const valorTotalNum = parseFloat(newPagamento.valorTotal) || 0
    const valorParcela = Number((valorTotalNum / qtdParcelas).toFixed(2))

    const novosItens = []
    let dataBase = new Date(newPagamento.vencimentoInicial + "T00:00:00")

    for (let i = 1; i <= qtdParcelas; i++) {
      const dataVencStr = dataBase.toISOString().split("T")[0]
      novosItens.push({
        beneficiario: credorObj.nome,
        categoria: credorObj.categoria,
        descricao: `${credorObj.nome} (${i}x${qtdParcelas})`,
        valor: valorParcela,
        vencimento: dataVencStr,
        status: "pendente",
        anotacoes: newPagamento.anotacoes,
        user_id: session.user.id,
      })
      dataBase.setMonth(dataBase.getMonth() + 1)
    }

    if (supabase) {
      const { data } = await supabase
        .from("pagamentos")
        .insert(novosItens)
        .select()
      if (data) setPagamentos([...pagamentos, ...data])
    }
    setShowAddPagamentoModal(false)
    setNewPagamento({
      credor_id: "",
      valorTotal: "",
      parcelas: "1",
      vencimentoInicial: new Date().toISOString().split("T")[0],
      anotacoes: "",
    })
  }

  const deletePagamento = async (id) => {
    if (!confirm("Deseja excluir?")) return
    if (supabase) await supabase.from("pagamentos").delete().eq("id", id)
    setPagamentos(pagamentos.filter((p) => p.id !== id))
  }

  const toggleStatusPagamento = async (id, currentStatus) => {
    const novoStatus = currentStatus === "pago" ? "pendente" : "pago"
    if (supabase)
      await supabase
        .from("pagamentos")
        .update({ status: novoStatus })
        .eq("id", id)
    setPagamentos(
      pagamentos.map((p) => (p.id === id ? { ...p, status: novoStatus } : p)),
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // TELA DE LOGIN / CADASTRO SE NÃO ESTIVER AUTENTICADO
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent text-center">
              Gestão Financeira V
            </h1>
            <p className="text-sm text-slate-400 mt-2 text-center">
              {isRegistering
                ? "Crie sua nova conta para começar."
                : "Área restrita. Faça login para acessar seus dados."}
            </p>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs text-center">
              {authError}
            </div>
          )}

          {/* Formulário de E-mail e Senha */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                E-mail
              </label>
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Senha
              </label>
              <input
                type="password"
                required
                placeholder="********"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition text-sm"
            >
              {isRegistering ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {isRegistering ? "Cadastrar Nova Conta" : "Entrar com E-mail"}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase">
              ou
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Botão Google */}
          <button
            onClick={handleLoginGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 px-4 rounded-xl shadow-lg transition text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Entrar com o Google
          </button>

          {/* Botão de Alternar entre Login e Cadastro */}
          <div className="text-center pt-2">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering)
                setAuthError("")
              }}
              className="text-xs text-blue-400 hover:text-blue-300 underline font-medium transition"
            >
              {isRegistering
                ? "Já tem uma conta? Faça login"
                : "Não tem conta? Cadastre-se aqui"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totalGeral = recebimentos.reduce(
    (acc, item) => acc + Number(item.valor),
    0,
  )
  const totalRecebido = recebimentos
    .filter((i) => i.status === "pago")
    .reduce((acc, item) => acc + Number(item.valor), 0)
  const totalPendente = totalGeral - totalRecebido

  const lembretes = recebimentos.filter((item) => {
    if (item.status === "pago") return false
    const st = getStatusItem(item)
    return st === "atrasado" || st === "mes_atual"
  })

  const itensFiltrados = recebimentos.filter((item) => {
    const st = getStatusItem(item)
    if (filtroStatus === "pago" && item.status !== "pago") return false
    if (filtroStatus === "pendente" && item.status === "pago") return false
    if (filtroStatus === "atrasado" && st !== "atrasado") return false
    if (filtroStatus === "mes_atual" && st !== "mes_atual") return false
    if (filtroCliente !== "todos" && item.cliente !== filtroCliente)
      return false
    return true
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho com botão de Sair */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Gestão Financeira V
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Logado como:{" "}
              <span className="text-slate-200 font-medium">
                {session.user.email}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDados}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
              title="Atualizar"
            >
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 font-medium px-3.5 py-2.5 rounded-xl border border-rose-500/20 transition"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
            {abaAtiva === "recebimentos" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg transition"
              >
                <Plus className="w-5 h-5" /> Novo Recebimento
              </button>
            )}
            {abaAtiva === "pagamentos" && (
              <button
                onClick={() => setShowAddPagamentoModal(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg transition"
              >
                <Plus className="w-5 h-5" /> Novo Pagamento
              </button>
            )}
            {abaAtiva === "clientes" && (
              <button
                onClick={() => setShowClienteModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg transition"
              >
                <Users className="w-5 h-5" /> Cadastrar Cliente
              </button>
            )}
            {abaAtiva === "credores" && (
              <button
                onClick={() => setShowCredorModal(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg transition"
              >
                <Store className="w-5 h-5" /> Cadastrar Loja / Credor
              </button>
            )}
          </div>
        </header>

        {/* Abas */}
        <div className="flex border-b border-slate-800 gap-4 overflow-x-auto">
          <button
            onClick={() => setAbaAtiva("recebimentos")}
            className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${abaAtiva === "recebimentos" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400"}`}
          >
            <Wallet className="w-4 h-4" /> Recebimentos
          </button>
          <button
            onClick={() => setAbaAtiva("pagamentos")}
            className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${abaAtiva === "pagamentos" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400"}`}
          >
            <CreditCard className="w-4 h-4" /> Pagamentos
          </button>
          <button
            onClick={() => setAbaAtiva("clientes")}
            className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${abaAtiva === "clientes" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400"}`}
          >
            <Users className="w-4 h-4" /> Clientes ({clientes.length})
          </button>
          <button
            onClick={() => setAbaAtiva("credores")}
            className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${abaAtiva === "credores" ? "border-purple-500 text-purple-400" : "border-transparent text-slate-400"}`}
          >
            <Store className="w-4 h-4" /> Lojas / Credores ({credores.length})
          </button>
        </div>

        {errorMsg && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl text-sm">
            {errorMsg}
          </div>
        )}

        {/* CONTEÚDO DA ABA RECEBIMENTOS */}
        {abaAtiva === "recebimentos" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-slate-400">
                    Total Geral
                  </p>
                  <p className="text-2xl font-bold text-slate-100">
                    R$ {totalGeral.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-slate-400">Recebido</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    R$ {totalRecebido.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-slate-400">A Receber</p>
                  <p className="text-2xl font-bold text-rose-400">
                    R$ {totalPendente.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </div>

            {lembretes.length > 0 && (
              <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 p-5 rounded-2xl shadow-xl">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-3">
                  <Bell className="w-5 h-5 animate-bounce" />
                  <h2>Lembretes de Cobrança ({lembretes.length} itens)</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lembretes.map((item) => {
                    const cliObj = clientes.find((c) => c.nome === item.cliente)
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border bg-slate-900/50 border-amber-500/30 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          {cliObj?.foto_url ? (
                            <img
                              src={formatarUrlFoto(cliObj.foto_url)}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                              {item.cliente.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-200">
                              {item.cliente}
                            </span>
                            <p className="text-xs text-slate-400">
                              {item.descricao} - R${" "}
                              {Number(item.valor).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            enviarWhatsAppCliente(
                              item.cliente,
                              item.descricao,
                              item.valor,
                              item.vencimento,
                            )
                          }
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Cobrar
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2">
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2"
                >
                  <option value="todos">Todos Status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="pago">Pagos</option>
                  <option value="atrasado">🔴 Vencidos</option>
                  <option value="mes_atual">🟠 Mês Atual</option>
                </select>
                <select
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2"
                >
                  <option value="todos">Todos Clientes</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-slate-400">
                Mostrando {itensFiltrados.length} itens
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 text-xs uppercase">
                    <th className="p-4">Status</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4">Valor</th>
                    <th className="p-4">Vencimento</th>
                    <th className="p-4">Motivo / Obs</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {itensFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="p-8 text-center text-slate-500"
                      >
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    itensFiltrados.map((item) => {
                      const st = getStatusItem(item)
                      const isEditing = editingId === item.id
                      const cliObj = clientes.find(
                        (c) => c.nome === item.cliente,
                      )
                      let badgeColor =
                        item.status === "pago"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : st === "atrasado"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-orange-500/10 text-orange-400"
                      let badgeText =
                        item.status === "pago"
                          ? "Pago ✅"
                          : st === "atrasado"
                            ? "Vencido 🔴"
                            : "Pendente ⏳"

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40">
                          <td className="p-4">
                            <button
                              onClick={() =>
                                toggleStatusRecebimento(item.id, item.status)
                              }
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeColor}`}
                            >
                              {badgeText}
                            </button>
                          </td>
                          <td className="p-4 font-semibold text-slate-200 flex items-center gap-3">
                            {cliObj?.foto_url ? (
                              <img
                                src={formatarUrlFoto(cliObj.foto_url)}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-slate-700"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold">
                                {item.cliente.charAt(0)}
                              </div>
                            )}
                            {item.cliente}
                          </td>
                          <td className="p-4 text-slate-300">
                            {item.descricao}
                          </td>
                          <td className="p-4 font-mono text-slate-100">
                            R$ {Number(item.valor).toFixed(2)}
                          </td>
                          <td className="p-4">
                            {isEditing ? (
                              <input
                                type="date"
                                value={editData.vencimento}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    vencimento: e.target.value,
                                  })
                                }
                                className="bg-slate-800 text-xs rounded px-2 py-1 text-white"
                              />
                            ) : (
                              item.vencimento.split("-").reverse().join("/")
                            )}
                          </td>
                          <td className="p-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.motivo_atraso}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    motivo_atraso: e.target.value,
                                  })
                                }
                                placeholder="Motivo..."
                                className="bg-slate-800 text-xs rounded px-2 py-1 w-full text-white"
                              />
                            ) : (
                              <span className="text-xs italic text-slate-400">
                                {item.motivo_atraso || "-"}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <button
                              onClick={() =>
                                enviarWhatsAppCliente(
                                  item.cliente,
                                  item.descricao,
                                  item.valor,
                                  item.vencimento,
                                )
                              }
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                              title="Cobrar WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEditRecebimento(item.id)}
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 bg-slate-700 text-slate-300 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditRecebimento(item)}
                                  className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteRecebimento(item.id)}
                                  className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ABA CLIENTES */}
        {abaAtiva === "clientes" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-200 text-sm">
                Gerenciamento de Clientes
              </h2>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/30 text-slate-400 text-xs uppercase">
                  <th className="p-4">Cliente</th>
                  <th className="p-4">WhatsApp</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Endereço</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">
                      Nenhum cliente cadastrado.
                    </td>
                  </tr>
                ) : (
                  clientes.map((cli) => {
                    const isEditing = editingClienteId === cli.id
                    return (
                      <tr key={cli.id} className="hover:bg-slate-800/40">
                        <td className="p-4 font-semibold text-slate-200 flex items-center gap-3">
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="URL ou ID Drive"
                              value={editClienteData.foto_url}
                              onChange={(e) =>
                                setEditClienteData({
                                  ...editClienteData,
                                  foto_url: e.target.value,
                                })
                              }
                              className="bg-slate-800 text-xs p-1 rounded text-white w-28"
                            />
                          ) : cli.foto_url ? (
                            <img
                              src={formatarUrlFoto(cli.foto_url)}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                              {cli.nome.charAt(0)}
                            </div>
                          )}
                          {isEditing ? (
                            <input
                              type="text"
                              value={editClienteData.nome}
                              onChange={(e) =>
                                setEditClienteData({
                                  ...editClienteData,
                                  nome: e.target.value,
                                })
                              }
                              className="bg-slate-800 text-xs p-1 rounded text-white"
                            />
                          ) : (
                            cli.nome
                          )}
                        </td>
                        <td className="p-4 text-emerald-400">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editClienteData.whatsapp}
                              onChange={(e) =>
                                setEditClienteData({
                                  ...editClienteData,
                                  whatsapp: e.target.value,
                                })
                              }
                              className="bg-slate-800 text-xs p-1 rounded text-white"
                            />
                          ) : (
                            cli.whatsapp || "-"
                          )}
                        </td>
                        <td className="p-4 text-slate-300">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editClienteData.email}
                              onChange={(e) =>
                                setEditClienteData({
                                  ...editClienteData,
                                  email: e.target.value,
                                })
                              }
                              className="bg-slate-800 text-xs p-1 rounded text-white"
                            />
                          ) : (
                            cli.email || "-"
                          )}
                        </td>
                        <td className="p-4 text-slate-300">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editClienteData.endereco}
                              onChange={(e) =>
                                setEditClienteData({
                                  ...editClienteData,
                                  endereco: e.target.value,
                                })
                              }
                              className="bg-slate-800 text-xs p-1 rounded text-white"
                            />
                          ) : (
                            cli.endereco || "-"
                          )}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEditCliente(cli.id)}
                                className="p-1.5 bg-emerald-600 text-white rounded-lg"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingClienteId(null)}
                                className="p-1.5 bg-slate-700 text-slate-300 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditCliente(cli)}
                                className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteCliente(cli.id)}
                                className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA CREDORES / LOJAS */}
        {abaAtiva === "credores" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-200 text-sm">
                Gerenciamento de Lojas e Credores
              </h2>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/30 text-slate-400 text-xs uppercase">
                  <th className="p-4">Loja / Credor</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">WhatsApp</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {credores.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-500">
                      Nenhuma loja cadastrada.
                    </td>
                  </tr>
                ) : (
                  credores.map((cred) => {
                    const isEditing = editingCredorId === cred.id
                    return (
                      <tr key={cred.id} className="hover:bg-slate-800/40">
                        <td className="p-4 font-semibold text-slate-200 flex items-center gap-3">
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="URL ou ID Drive"
                              value={editCredorData.foto_url}
                              onChange={(e) =>
                                setEditCredorData({
                                  ...editCredorData,
                                  foto_url: e.target.value,
                                })
                              }
                              className="bg-slate-800 text-xs p-1 rounded text-white w-28"
                            />
                          ) : cred.foto_url ? (
                            <img
                              src={formatarUrlFoto(cred.foto_url)}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                              {cred.nome.charAt(0)}
                            </div>
                          )}
                          {isEditing ? (
                            <input
                              type="text"
                              value={editCredorData.nome}
                              onChange={(e) =>
                                setEditCredorData({
                                  ...editCredorData,
                                  nome: e.target.value,
                                })
                              }
                              className="bg-slate-800 text-xs p-1 rounded text-white"
                            />
                          ) : (
                            cred.nome
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <select
                              value={editCredorData.categoria}
                              onChange={(e) =>
                                setEditCredorData({
                                  ...editCredorData,
                                  categoria: e.target.value,
                                })
                              }
                              className="bg-slate-800 text-xs p-1 rounded text-white"
                            >
                              <option value="Comida">Comida</option>
                              <option value="Transporte">Transporte</option>
                              <option value="Lazer">Lazer</option>
                              <option value="Saúde">Saúde</option>
                              <option value="Outros">Outros</option>
                            </select>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-800 text-indigo-300 rounded-lg text-xs">
                              {cred.categoria}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-emerald-400">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editCredorData.whatsapp}
                              onChange={(e) =>
                                setEditCredorData({
                                  ...editCredorData,
                                  whatsapp: e.target.value,
                                })
                              }
                              className="bg-slate-800 text-xs p-1 rounded text-white"
                            />
                          ) : (
                            cred.whatsapp || "-"
                          )}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEditCredor(cred.id)}
                                className="p-1.5 bg-emerald-600 text-white rounded-lg"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingCredorId(null)}
                                className="p-1.5 bg-slate-700 text-slate-300 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditCredor(cred)}
                                className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteCredor(cred.id)}
                                className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA PAGAMENTOS */}
        {abaAtiva === "pagamentos" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-200 text-sm">
                Controle de Pagamentos & Despesas
              </h2>
              <span className="text-xs text-slate-400">
                Total: R${" "}
                {pagamentos
                  .reduce((acc, p) => acc + Number(p.valor), 0)
                  .toFixed(2)}
              </span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/30 text-slate-400 text-xs uppercase">
                  <th className="p-4">Status</th>
                  <th className="p-4">Loja / Credor</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {pagamentos.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      Nenhum pagamento registrado.
                    </td>
                  </tr>
                ) : (
                  pagamentos.map((p) => {
                    const credObj = credores.find(
                      (c) => c.nome === p.beneficiario,
                    )
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="p-4">
                          <button
                            onClick={() =>
                              toggleStatusPagamento(p.id, p.status)
                            }
                            className={`px-3 py-1 rounded-full text-xs border ${p.status === "pago" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}
                          >
                            {p.status === "pago" ? "Pago ✅" : "Pendente ⏳"}
                          </button>
                        </td>
                        <td className="p-4 font-semibold text-slate-200 flex items-center gap-3">
                          {credObj?.foto_url ? (
                            <img
                              src={formatarUrlFoto(credObj.foto_url)}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold">
                              {p.beneficiario.charAt(0)}
                            </div>
                          )}
                          {p.beneficiario}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-800 text-indigo-300 rounded-lg text-xs">
                            {p.categoria}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">{p.descricao}</td>
                        <td className="p-4 font-mono text-slate-100">
                          R$ {Number(p.valor).toFixed(2)}
                        </td>
                        <td className="p-4 text-slate-300">
                          {p.vencimento.split("-").reverse().join("/")}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => deletePagamento(p.id)}
                            className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CADASTRAR CLIENTE */}
      {showClienteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-100">
                Cadastrar Novo Cliente
              </h2>
              <button onClick={() => setShowClienteModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddCliente} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newCliente.nome}
                  onChange={(e) =>
                    setNewCliente({ ...newCliente, nome: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  WhatsApp (com DDD)
                </label>
                <input
                  type="text"
                  placeholder="88999998888"
                  value={newCliente.whatsapp}
                  onChange={(e) =>
                    setNewCliente({ ...newCliente, whatsapp: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Link ou ID da Foto do Drive (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Cole o link ou ID..."
                  value={newCliente.foto_url}
                  onChange={(e) =>
                    setNewCliente({ ...newCliente, foto_url: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={newCliente.email}
                  onChange={(e) =>
                    setNewCliente({ ...newCliente, email: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={newCliente.endereco}
                  onChange={(e) =>
                    setNewCliente({ ...newCliente, endereco: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowClienteModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR CREDOR */}
      {showCredorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-100">
                Cadastrar Nova Loja / Credor
              </h2>
              <button onClick={() => setShowCredorModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddCredor} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Nome da Loja / Credor
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supermercado..."
                  value={newCredor.nome}
                  onChange={(e) =>
                    setNewCredor({ ...newCredor, nome: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Categoria
                </label>
                <select
                  value={newCredor.categoria}
                  onChange={(e) =>
                    setNewCredor({ ...newCredor, categoria: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                >
                  <option value="Comida">Comida</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  WhatsApp / Contato
                </label>
                <input
                  type="text"
                  placeholder="88999998888"
                  value={newCredor.whatsapp}
                  onChange={(e) =>
                    setNewCredor({ ...newCredor, whatsapp: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Link ou ID da Logo do Drive (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Cole o link ou ID..."
                  value={newCredor.foto_url}
                  onChange={(e) =>
                    setNewCredor({ ...newCredor, foto_url: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCredorModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-xl"
                >
                  Salvar Loja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO RECEBIMENTO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-100">
                Novo Recebimento / Venda
              </h2>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddRecebimento} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Selecione o Cliente
                </label>
                <select
                  required
                  value={newItem.cliente_id}
                  onChange={(e) =>
                    setNewItem({ ...newItem, cliente_id: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                >
                  <option value="">-- Escolha um cliente cadastrado --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Descrição do Item
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Monitor, Cama..."
                  value={newItem.descricao}
                  onChange={(e) =>
                    setNewItem({ ...newItem, descricao: e.target.value })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newItem.valorTotal}
                    onChange={(e) =>
                      setNewItem({ ...newItem, valorTotal: e.target.value })
                    }
                    className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Qtd Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newItem.parcelas}
                    onChange={(e) =>
                      setNewItem({ ...newItem, parcelas: e.target.value })
                    }
                    className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Vencimento 1ª Parcela
                </label>
                <input
                  type="date"
                  required
                  value={newItem.vencimentoInicial}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      vencimentoInicial: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl"
                >
                  Gerar Parcelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO PAGAMENTO */}
      {showAddPagamentoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-100">
                Novo Pagamento / Despesa
              </h2>
              <button onClick={() => setShowAddPagamentoModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddPagamento} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Selecione a Loja / Credor
                </label>
                <select
                  required
                  value={newPagamento.credor_id}
                  onChange={(e) =>
                    setNewPagamento({
                      ...newPagamento,
                      credor_id: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                >
                  <option value="">-- Escolha uma loja cadastrada --</option>
                  {credores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.categoria})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newPagamento.valorTotal}
                    onChange={(e) =>
                      setNewPagamento({
                        ...newPagamento,
                        valorTotal: e.target.value,
                      })
                    }
                    className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Qtd Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPagamento.parcelas}
                    onChange={(e) =>
                      setNewPagamento({
                        ...newPagamento,
                        parcelas: e.target.value,
                      })
                    }
                    className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Data 1º Vencimento
                </label>
                <input
                  type="date"
                  required
                  value={newPagamento.vencimentoInicial}
                  onChange={(e) =>
                    setNewPagamento({
                      ...newPagamento,
                      vencimentoInicial: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 text-sm rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddPagamentoModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
