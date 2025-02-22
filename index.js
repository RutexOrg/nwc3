import { createSocket } from 'dgram';

const socket = createSocket('udp4');

const PORT = 6112;
const VERSION = [1, 26]; // TODO: Get this from the client


// thanks to
// https://github.com/magynhard/wc3_protocol
 
// Get game name from the data starting at byte 20
const getStringSegment = (data) => {
    const firstZeroIndex = data.indexOf(0);
    if (firstZeroIndex === -1) return '';
    return Buffer.from(data.slice(0, firstZeroIndex)).toString('utf8');
};

const decodeStringPart = (data) => {
    const MASK_INTERVAL = 8;
    const DECODE_OFFSET = 1;
    
    const decodedBytes = [];
    let currentMask = 0;
    
    for (let i = 0; i < data.length; i++) {
        if (i % MASK_INTERVAL === 0) {
            currentMask = data[i];
            continue;
        }
        
        const maskBit = 1 << (i % MASK_INTERVAL);
        const byte = (currentMask & maskBit) === 0 ? 
            data[i] - DECODE_OFFSET : 
            data[i];
            
        decodedBytes.push(byte);
    }
    
    return Buffer.from(decodedBytes);
};


// todo try catch
socket.on('message', (msg, rinfo) => {
    // console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
    // const packetSize = 16;

    const buffer = Buffer.from(msg);
    
    const rawBytes = [...buffer];
    
    const magicByte = rawBytes[0].toString(16);
    const opCode = rawBytes[1].toString(16);
    const packetSize = buffer.readUInt16LE(2);
    const gameType = buffer.slice(4, 8).reverse().toString();
    const gameVersion = "1." + buffer.readUInt32LE(8);
    const gameId = buffer.readUInt32LE(12);

    const senderInfo = {
        addressFamily: rinfo.family,
        port: rinfo.port,
        hostname: rinfo.address,
        ipAddress: rinfo.address
    };

    let gameName;
    let gameMapName;
    let gameMapWidth;
    let gameMapHeight;
    let tickCountMs;
    let gameSettings;
    let gameNumberOfSlots;
    let gameFlags;
    let gamePlayerSlots;
    let gameNonComputerSlots;
    let gameComputerOrClosedSlots;
    let gameRemainingSlots;
    let gameFilledSlots;
    let gamePort;




    if (opCode === '30') {
        tickCountMs = buffer.readUInt32LE(16);
        gameSettings = buffer.readUInt32LE(20);

        const gameInfoBytes = buffer.slice(20, buffer.length - 23);
        gameName = getStringSegment(buffer.slice(20));
        const encodedSegmentStartIndex = 22 + Buffer.from(gameName).length;
        const decrypted = decodeStringPart(buffer.slice(encodedSegmentStartIndex));
        
        gameSettings = decrypted.readUInt32LE(0);
        gameMapWidth = decrypted.readUInt16LE(5);
        gameMapHeight = decrypted.readUInt16LE(7);
        
        gameMapName = decrypted.slice(13).toString('utf8');
        const nullTermIndex = gameMapName.indexOf('\x00');
        if (nullTermIndex !== -1) {
            gameMapName = gameMapName.slice(0, nullTermIndex);
        }
        
        const mapNameParts = gameMapName.split('\\');
        gameMapName = mapNameParts[mapNameParts.length - 1] || gameMapName;
        gameNumberOfSlots = buffer.readUInt32LE(buffer.length - 22);
        gameFlags = buffer.readUInt32LE(buffer.length - 18);
        gamePlayerSlots = buffer.readUInt32LE(buffer.length - 14);
        gameNonComputerSlots = buffer.readUInt32LE(buffer.length - 10);
        gameComputerOrClosedSlots = gameNumberOfSlots - gameNonComputerSlots;
        gameRemainingSlots = gameNumberOfSlots - gameComputerOrClosedSlots - gamePlayerSlots;
        gameFilledSlots = gameComputerOrClosedSlots + gamePlayerSlots;
        gamePort = buffer.readUInt16LE(buffer.length - 2);


    } else {
        return console.log('Unknown packet type');
    }

    console.log(`Received packet from ${senderInfo.ipAddress}:${senderInfo.port}`);
    console.log(`Magic Byte: ${magicByte}`);
    console.log(`Op Code: ${opCode}`);
    console.log(`Packet Size: ${packetSize}`);
    console.log(`Game Type: ${gameType}`);
    console.log(`Game Name: ${gameName}`);
    console.log(`Game Map Name: ${gameMapName}`);
    console.log(`Game Map Width: ${gameMapWidth}`);
    console.log(`Game Map Height: ${gameMapHeight}`);
    console.log(`Game Version: ${gameVersion}`);
    console.log(`Game ID: ${gameId}`);
    console.log(`Tick Count (ms): ${tickCountMs}`);
    console.log(`Game Settings: ${gameSettings}`);
    console.log(`Game Number of Slots: ${gameNumberOfSlots}`);
    console.log(`Game Flags: ${gameFlags}`);
    console.log(`Game Player Slots: ${gamePlayerSlots}`);
    console.log(`Game Non-Computer Slots: ${gameNonComputerSlots}`);
    console.log(`Game Computer or Closed Slots: ${gameComputerOrClosedSlots}`);
    console.log(`Game Remaining Slots: ${gameRemainingSlots}`);
    console.log(`Game Filled Slots: ${gameFilledSlots}`);
    console.log(`Game Port: ${gamePort}`);

    process.exit();
});

socket.on('listening', () => {
    const address = socket.address();
    console.log(`server listening ${address.address}:${address.port}`);
});

socket.bind(PORT);