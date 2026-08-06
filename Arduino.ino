#include <SPI.h>
#include <Ethernet.h>

// --- CONFIGURAÇÕES DE REDE ---
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
IPAddress iotIP(192, 168, 0, 150);
IPAddress dnsIP(192, 168, 0, 1);
IPAddress gatewayIP(192, 168, 0, 1);
IPAddress subnet(255, 255, 255, 0);

// --- CONFIGURAÇÕES BROKER MQTT ---
IPAddress serverIP(192, 168, 0, 102);
const uint16_t serverPort = 1883;

const char* mqttUser     = "";
const char* mqttPass     = "";
const char* clientID     = "arduino_client_01";
const char* pubTopic     = "/sensor/token";
const char* subTopic     = "/sensor/codigo_serial/status";

const char* codigoSerial = "";
const char* chaveSecreta = "";

EthernetClient client;

// Controle de tempo para tentativa de reconexão
unsigned long ultimatenatativa = 0;
const unsigned long intervaloReconexao = 2000; // 2 segundos entre tentativas

void writeMQTTString(const char* str) {
  uint16_t len = strlen(str);
  client.write((uint8_t)(len >> 8));
  client.write((uint8_t)(len & 0xFF));
  client.write((const uint8_t*)str, len);
}

bool mqttConnect() {
  uint16_t protocolNameLen = 4;
  uint16_t clientIDLen     = strlen(clientID);
  uint16_t userLen         = strlen(mqttUser);
  uint16_t passLen         = strlen(mqttPass);

  uint16_t varHeaderLen = 2 + protocolNameLen + 1 + 1 + 2;
  uint16_t payloadLen   = 2 + clientIDLen + 2 + userLen + 2 + passLen;
  uint16_t remainingLength = varHeaderLen + payloadLen;

  client.write((uint8_t)0x10);
  client.write((uint8_t)remainingLength);

  writeMQTTString("MQTT");
  client.write((uint8_t)0x04);
  client.write((uint8_t)0xC2);
  
  client.write((uint8_t)0x00);
  client.write((uint8_t)0x3C); // Keep-Alive 60s

  writeMQTTString(clientID);
  writeMQTTString(mqttUser);
  writeMQTTString(mqttPass);

  // MAIOR TOLERÂNCIA: Aguarda até 5 segundos pela resposta do login (CONNACK)
  unsigned long start = millis();
  while (client.connected() && millis() - start < 5000) {
    if (client.available() >= 4) {
      uint8_t b1 = client.read();
      uint8_t b2 = client.read();
      uint8_t b3 = client.read();
      uint8_t returnCode = client.read();

      if (b1 == 0x20 && returnCode == 0x00) {
        return true;
      } else {
        return false;
      }
    }
  }
  return false;
}

void mqttSubscribe(const char* topic) {
  uint16_t topicLen = strlen(topic);
  uint16_t packetID = 1;
  uint16_t remainingLength = 2 + 2 + topicLen + 1;

  client.write((uint8_t)0x82);
  client.write((uint8_t)remainingLength);

  client.write((uint8_t)(packetID >> 8));
  client.write((uint8_t)(packetID & 0xFF));

  writeMQTTString(topic);
  client.write((uint8_t)0x00);

  Serial.print(F("-> Inscrito no topico de resposta: "));
  Serial.println(topic);
}

void mqttPublish(const char* topic, const char* payload) {
  uint16_t topicLen = strlen(topic);
  uint16_t payloadLen = strlen(payload);
  uint16_t remainingLength = 2 + topicLen + payloadLen;

  client.write((uint8_t)0x30);
  client.write((uint8_t)remainingLength);

  writeMQTTString(topic);
  client.write((const uint8_t*)payload, payloadLen);

  Serial.println(F("-> JSON publicado no servidor."));
}

void tentarConectar() {
  Serial.print(F("Limpando sockets antigos... "));
  client.stop(); // LIMPEZA OBRIGATÓRIA: Garante que o socket do W5100 seja liberado
  delay(100);

  Serial.print(F("Conectando ao Broker... "));

  if (client.connect(serverIP, serverPort)) {
    if (mqttConnect()) {
      Serial.println(F("[SUCESSO] Conectado ao Broker!"));

      // 1. Inscreve no tópico de status
      mqttSubscribe(subTopic);
      delay(300); // Pausa para o Broker processar a inscrição

      // 2. Prepara e envia o JSON
      char jsonBuffer[128];
      snprintf(jsonBuffer, sizeof(jsonBuffer), 
               "{\"codigo_serial\":\"%s\",\"chave_secreta_dispositivo\":\"%s\"}", 
               codigoSerial, chaveSecreta);

      mqttPublish(pubTopic, jsonBuffer);
      Serial.print(F("Payload enviado: "));
      Serial.println(jsonBuffer);
      Serial.println(F("Aguardando resposta do servidor (Timeout 5s)..."));

      // 3. ESPERA ATIVA PELA RESPOSTA: Trava aqui até chegar algum byte ou estourar 5 segundos
      unsigned long inicioEspera = millis();
      bool respostaChegou = false;

      while (millis() - inicioEspera < 5000) {
        if (client.available()) {
          respostaChegou = true;
          break; // Dados chegaram! Sai do loop de espera e vai ler abaixo
        }
        delay(10); // Pequeno descanso para o processador
      }

      if (!respostaChegou) {
        Serial.println(F("-> [TIMEOUT]: O servidor nao respondeu dentro de 5 segundos."));
      }

    } else {
      Serial.println(F("[FALHA] Recusado no Handshake MQTT."));
      client.stop();
    }
  } else {
    Serial.println(F("[FALHA] Servidor nao respondeu na porta TCP."));
    client.stop();
  }
}

void setup() {
  Serial.begin(9600);
  while (!Serial);

  // OBRIGATÓRIO: Desativa o leitor SD (Pino 4)
  pinMode(4, OUTPUT);
  digitalWrite(4, HIGH);

  Serial.println(F("Iniciando Ethernet..."));
  Ethernet.begin(mac, iotIP, dnsIP, gatewayIP, subnet);
  
  // TOLERÂNCIA AUMENTADA: 3.5 segundos para ligar a placa fisicamente
  delay(3500); 

  Serial.print(F("IP do Arduino: "));
  Serial.println(Ethernet.localIP());
}

void loop() {
  if (client.connected()) {
    // Verifica se há dados disponíveis para leitura no socket TCP
    if (client.available()) {
      uint8_t header = client.read();

      // Pacote PUBLISH recebido do Broker
      if ((header & 0xF0) == 0x30) {
        
        // Aguarda todos os bytes do cabeçalho chegarem
        delay(100); 

        // Lê a extensão do pacote (Remaining Length)
        uint32_t multiplier = 1;
        uint32_t remLen = 0;
        uint8_t encodedByte;
        do {
          encodedByte = client.read();
          remLen += (encodedByte & 127) * multiplier;
          multiplier *= 128;
        } while ((encodedByte & 128) != 0);

        // Lê o tamanho do tópico
        uint8_t topicLenMsb = client.read();
        uint8_t topicLenLsb = client.read();
        uint16_t topicLen = (topicLenMsb << 8) | topicLenLsb;

        // Descarta o nome do tópico do buffer
        for (uint16_t i = 0; i < topicLen; i++) {
          client.read();
        }

        // Calcula o tamanho exato do Payload JSON
        int payloadLen = remLen - 2 - topicLen;

        Serial.println(F("=================================="));
        Serial.print(F("--- RESPOSTA RECEBIDA ("));
        Serial.print(payloadLen);
        Serial.println(F(" bytes) ---"));

        // Lê caractere por caractere o JSON recebido
        for (int i = 0; i < payloadLen; i++) {
          // Aguarda com timeout curto se a rede der uma engasgada
          unsigned long t = millis();
          while (!client.available() && millis() - t < 1000);

          if (client.available()) {
            char c = client.read();
            Serial.print(c); // Imprime diretamente na Serial
          }
        }
        Serial.println();
        Serial.println(F("==================================\n"));
      }
    }
  } else {
    // Tenta reconectar em intervalos regulares
    unsigned long agora = millis();
    if (agora - ultimatenatativa >= intervaloReconexao) {
      ultimatenatativa = agora;
      tentarConectar();
    }
  }
}
