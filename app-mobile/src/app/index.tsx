import * as Haptics from 'expo-haptics';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Image, Alert } from 'react-native';
import { io } from 'socket.io-client';
import { FontAwesome5 } from '@expo/vector-icons';

// ============================================================================
// FRONTEND MOBILE (Driver / Operador de Campo)
// Responsabilidade: Interface Offline-First e Comunicação de Baixa Latência
// ============================================================================

export default function Index() {
  const [precoAtual, setPrecoAtual] = useState(0);
  const [statusConexao, setStatusConexao] = useState('A conectar...');
  const [socket, setSocket] = useState(null);

  const loteId = '4'; // Referência estática (Bypass do Gateway para Prova de Conceito)

  useEffect(() => {
    // ------------------------------------------------------------------------
    // 1. WEBSOCKETS: Conexão Bidirecional Contínua (Sem Polling)
    // ------------------------------------------------------------------------
    const IP_LOCAL = '192.168.0.14'; // Altere para o IP da sua máquina no dia
    const novaConexao = io('http://${IP_LOCAL}:8080');

    novaConexao.on('connect', () => {
      setStatusConexao('🟢 Conectado');
      novaConexao.emit('entrar_sala', loteId);
    });

    // Escuta ativa: A tela atualiza no milissegundo em que um lance chega
    novaConexao.on('atualizar_painel', (dados) => {
      setPrecoAtual(dados.valor);
    });

    // ------------------------------------------------------------------------
    // 2. FEEDBACK FÍSICO: Resposta Tátil ao Evento do Broker
    // ------------------------------------------------------------------------
    novaConexao.on('leilao_finalizado', (dados) => {
      // O motor do iPhone vibra fisicamente indicando o sucesso da transação
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        "Martelo Batido! 🔨", 
        `O leilão foi encerrado!\nValor: R$ ${dados.valor}\n${dados.mensagem}`,
        [{ text: "OK" }]
      );
      setPrecoAtual(0);
    });

    novaConexao.on('disconnect', () => {
      setStatusConexao('🔴 Desconectado');
    });

    setSocket(novaConexao);

    return () => novaConexao.disconnect();
  }, []);

  // --------------------------------------------------------------------------
  // 3. ENVIO DE EVENTOS: Otimista, dispara e não trava a interface
  // --------------------------------------------------------------------------
  const enviarLance = (incremento) => {
    if (socket && socket.connected) {
      const novoPreco = precoAtual + incremento;
      
      socket.emit('enviar_lance', {
        loteId: loteId,
        valor: novoPreco,
        usuario: 'Daniel Mobile'
      });
      
      setPrecoAtual(novoPreco);
      
      // Feedback leve para confirmar a ação ao usuário instantaneamente
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const confirmarEncerramento = () => {
    Alert.alert(
      "Encerrar Leilão",
      "Tem a certeza que deseja bater o martelo e enviar os dados para a auditoria?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Encerrar", 
          style: "destructive",
          onPress: () => {
            if (socket && socket.connected) {
              // Este evento irá acionar a gravação no RabbitMQ (Resiliência)
              socket.emit('encerrar_leilao', loteId);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <FontAwesome5 name="balance-scale" size={24} color="#d4af37" style={styles.iconeLogo} />
          <Text style={styles.logo}>Bid<Text style={styles.logoHighlight}>Auction</Text></Text>
        </View>
        <Text style={styles.status}>{statusConexao}</Text>
      </View>

      <View style={styles.card}>
        {/* -------------------------------------------------------------------
            4. OFFLINE-FIRST: A imagem pesada está embutida no pacote da App.
               Mesmo com internet lenta, a interface carrega instantaneamente. 
            ------------------------------------------------------------------- */}
        <Image 
          source={require('../../assets/images/Vectra.png')} 
          style={styles.imagemCarro}
          resizeMode="cover"
        />
        <Text style={styles.loteNome}>Chevrolet Vectra B 2.2 16v</Text>
        
        <View style={styles.precoContainer}>
          <Text style={styles.label}>Lance Atual</Text>
          <Text style={styles.preco}>
            R$ {precoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <Text style={styles.labelOpcoes}>Opções de Lance Rápidas:</Text>
        <View style={styles.botoesRow}>
          <TouchableOpacity style={styles.botaoLance} onPress={() => enviarLance(100)} activeOpacity={0.8}>
            <Text style={styles.textoBotao}>+ R$ 100</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.botaoLance} onPress={() => enviarLance(500)} activeOpacity={0.8}>
            <Text style={styles.textoBotao}>+ R$ 500</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoLanceDestaque} onPress={() => enviarLance(1000)} activeOpacity={0.8}>
            <Text style={styles.textoBotaoDestaque}>+ R$ 1000</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.botaoEncerrar} onPress={confirmarEncerramento} activeOpacity={0.8}>
          <Text style={styles.textoBotaoEncerrar}>BATER O MARTELO (ENCERRAR)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 30 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconeLogo: { marginRight: 8 },
  logo: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  logoHighlight: { color: '#d4af37' },
  status: { color: '#888', marginTop: 5, fontSize: 14 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 15, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  imagemCarro: { width: '100%', height: 180, borderRadius: 10, marginBottom: 15 },
  loteNome: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  precoContainer: { backgroundColor: '#2a2a2a', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  label: { color: '#aaa', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  preco: { color: '#d4af37', fontSize: 32, fontWeight: 'bold' },
  labelOpcoes: { color: '#888', fontSize: 14, marginBottom: 10, alignSelf: 'flex-start' },
  botoesRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 10 },
  botaoLance: { flex: 1, backgroundColor: '#333', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  botaoLanceDestaque: { flex: 1, backgroundColor: '#d4af37', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  textoBotao: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  textoBotaoDestaque: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  botaoEncerrar: { backgroundColor: '#8b0000', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 25, width: '100%', borderWidth: 1, borderColor: '#ff4444' },
  textoBotaoEncerrar: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }
});