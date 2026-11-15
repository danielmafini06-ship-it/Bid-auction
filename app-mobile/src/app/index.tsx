import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Image, Alert } from 'react-native';
import { io } from 'socket.io-client';
import { FontAwesome5 } from '@expo/vector-icons';

export default function Index() {
  const [precoAtual, setPrecoAtual] = useState(0);
  const [statusConexao, setStatusConexao] = useState('A conectar...');
  const [socket, setSocket] = useState(null);

  const loteId = '4'; // Vectra B

  useEffect(() => {
    const IP_LOCAL = '192.168.0.14';
    const novaConexao = io(`http://${IP_LOCAL}:3002`);

    novaConexao.on('connect', () => {
      setStatusConexao('🟢 Conectado');
      novaConexao.emit('entrar_sala', loteId);
    });

    novaConexao.on('atualizar_painel', (dados) => {
      setPrecoAtual(dados.valor);
    });

    // NOVO: Escuta o evento de finalização que o seu backend emite
    novaConexao.on('leilao_finalizado', (dados) => {
      Alert.alert(
        "Martelo Batido! 🔨", 
        `O leilão foi encerrado!\nValor: R$ ${dados.valor}\n${dados.mensagem}`,
        [{ text: "OK" }]
      );
      setPrecoAtual(0); // Reinicia o preço no ecrã para o próximo leilão
    });

    novaConexao.on('disconnect', () => {
      setStatusConexao('🔴 Desconectado');
    });

    setSocket(novaConexao);

    return () => novaConexao.disconnect();
  }, []);

  const enviarLance = (incremento) => {
    if (socket && socket.connected) {
      const novoPreco = precoAtual + incremento;
      
      socket.emit('enviar_lance', {
        loteId: loteId,
        valor: novoPreco,
        usuario: 'Daniel Mobile'
      });
      
      setPrecoAtual(novoPreco);
    }
  };

  // NOVA FUNÇÃO: Pede confirmação nativa e avisa o backend para encerrar
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

        {/* NOVO BOTÃO: Encerramento */}
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
  
  /* ESTILOS DO NOVO BOTÃO */
  botaoEncerrar: {
    backgroundColor: '#8b0000',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 25,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  textoBotaoEncerrar: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  }
});