const WORD_SIZE = 4

// Helper functions for bit manipulation
function getBits(value, high, low) {
  const mask = (1 << (high - low + 1)) - 1
  return (value >>> low) & mask
}

function signExtend(value, bits) {
  const sign = (value >>> (bits - 1)) & 1
  if (sign === 1) {
    return value | (~0 << bits)
  }
  return value
}

function formatImmediate(value) {
  if (value < 0) {
    return `#-0x${Math.abs(value).toString(16)}`
  }
  return `#0x${value.toString(16)}`
}

function getRegisterName(regNum, is64bit = true) {
  if (regNum === 31) {
    return 'sp'
  }
  return is64bit ? `x${regNum}` : `w${regNum}`
}

function disassembleBranch(instr) {
  // B and BL instructions
  if (getBits(instr, 31, 26) === 0b000101) {
    // Unconditional branch (B)
    const imm26 = getBits(instr, 25, 0)
    const offset = signExtend(imm26, 26) * 4
    return { mnemonic: 'b', operands: formatImmediate(offset) }
  }

  // Conditional branch (B.cond)
  if (getBits(instr, 31, 24) === 0b01010100) {
    const cond = getBits(instr, 3, 0)
    const condNames = [
      'eq', 'ne', 'cs', 'cc', 'mi', 'pl', 'vs', 'vc',
      'hi', 'ls', 'ge', 'lt', 'gt', 'le', 'al', 'nv'
    ]
    const imm19 = getBits(instr, 23, 5)
    const offset = signExtend(imm19, 19) * 4
    return { mnemonic: `b.${condNames[cond]}`, operands: formatImmediate(offset) }
  }

  // BR, BLR, RET (branch to register)
  if (getBits(instr, 31, 10) === 0b1101011000011111000000) {
    const op = getBits(instr, 21, 20)
    const rn = getBits(instr, 9, 5)
    const mnemonics = ['br', 'blr', 'ret', 'reta']
    const mnemonic = mnemonics[op]
    if (op === 2) {
      // ret
      return { mnemonic: 'ret', operands: '' }
    }
    return { mnemonic, operands: getRegisterName(rn) }
  }

  return null
}

function disassembleMovImmediate(instr) {
  // MOV (immediate) - MOVZ, MOVN, MOVK
  const op = getBits(instr, 31, 23)

  // MOVZ (Move wide with zero) - op = 0b010100101
  if (op === 0b010100101) {
    const sf = getBits(instr, 31, 31)
    const imm16 = getBits(instr, 20, 5)
    const shift = getBits(instr, 22, 21)
    const rd = getBits(instr, 4, 0)
    const is64bit = sf === 1

    if (shift === 0 && sf === 0) {
      return {
        mnemonic: 'mov',
        operands: `${getRegisterName(rd, false)}, #0x${imm16.toString(16)}`
      }
    }

    const shiftAmount = shift * 16
    return {
      mnemonic: 'movz',
      operands: `${getRegisterName(rd, is64bit)}, #0x${imm16.toString(16)}${shiftAmount > 0 ? `, lsl #${shiftAmount}` : ''}`
    }
  }

  // MOVK (Move wide keep) - op = 0b011100101
  if (op === 0b011100101) {
    const sf = getBits(instr, 31, 31)
    const imm16 = getBits(instr, 20, 5)
    const shift = getBits(instr, 22, 21)
    const rd = getBits(instr, 4, 0)
    const is64bit = sf === 1

    const shiftAmount = shift * 16
    return {
      mnemonic: 'movk',
      operands: `${getRegisterName(rd, is64bit)}, #0x${imm16.toString(16)}${shiftAmount > 0 ? `, lsl #${shiftAmount}` : ''}`
    }
  }

  // MOVN (Move wide NOT) - op = 0b000100101
  if (op === 0b000100101) {
    const sf = getBits(instr, 31, 31)
    const imm16 = getBits(instr, 20, 5)
    const shift = getBits(instr, 22, 21)
    const rd = getBits(instr, 4, 0)
    const is64bit = sf === 1

    const shiftAmount = shift * 16
    return {
      mnemonic: 'movn',
      operands: `${getRegisterName(rd, is64bit)}, #0x${imm16.toString(16)}${shiftAmount > 0 ? `, lsl #${shiftAmount}` : ''}`
    }
  }

  return null
}

function disassembleFloatingPoint(instr) {
  // Floating point operations
  const op0 = getBits(instr, 31, 28)
  const op1 = getBits(instr, 27, 25)
  const op2 = getBits(instr, 27, 24)

  // FP data processing (op0 == 0001 and op1 == 111)
  if (op0 === 0b0001 && op1 === 0b111) {
    const M = getBits(instr, 31, 31)
    const S = getBits(instr, 29, 29)
    const type = getBits(instr, 23, 22)
    const rmode = getBits(instr, 21, 19)
    const opcode = getBits(instr, 18, 15)
    const rn = getBits(instr, 9, 5)
    const rd = getBits(instr, 4, 0)

    // FMOV (general register to floating point)
    if (opcode === 0b0100) {
      const typeNames = ['s', 'd', 'h', '?']
      const regName = type === 1 ? getRegisterName(rn) : getRegisterName(rn, false)
      return {
        mnemonic: 'fmov',
        operands: `${typeNames[type]}${rd}, ${regName}`
      }
    }

    // FMOV (floating point to general register)
    if (opcode === 0b0110) {
      const typeNames = ['s', 'd', 'h', '?']
      const targetReg = type === 1 ? getRegisterName(rd) : getRegisterName(rd, false)
      return {
        mnemonic: 'fmov',
        operands: `${targetReg}, ${typeNames[type]}${rn}`
      }
    }

    // FMOV (register to register)
    if ((opcode & 0b1111) === 0b0000) {
      const typeNames = ['s', 'd', 'h', '?']
      return {
        mnemonic: 'fmov',
        operands: `${typeNames[type]}${rd}, ${typeNames[type]}${rn}`
      }
    }
  }

  // Also try matching by the pattern: op0 = 0001, bits [27:24] = 1110
  if (op0 === 0b0001 && op2 === 0b1110) {
    const type = getBits(instr, 23, 22)
    const rn = getBits(instr, 9, 5)
    const rd = getBits(instr, 4, 0)
    const bits_20_16 = getBits(instr, 20, 16)

    // FMOV (general to float) or (float to general)
    // If bits [20:16] in certain range, it's FMOV
    if (bits_20_16 === 0b00111 || bits_20_16 === 0b00110 || bits_20_16 === 0b00101) {
      const typeNames = ['s', 'd', 'h', '?']
      
      // Determine direction based on bit patterns
      if (bits_20_16 === 0b00111) {
        // General to float
        const regName = type === 1 ? getRegisterName(rn) : getRegisterName(rn, false)
        return {
          mnemonic: 'fmov',
          operands: `${typeNames[type]}${rd}, ${regName}`
        }
      } else if (bits_20_16 === 0b00110) {
        // Float to general
        const targetReg = type === 1 ? getRegisterName(rd) : getRegisterName(rd, false)
        return {
          mnemonic: 'fmov',
          operands: `${targetReg}, ${typeNames[type]}${rn}`
        }
      }
    }
  }

  return null
}

function disassembleRegisterMove(instr) {
  // MOV (register) - ORR with zero register
  const sf = getBits(instr, 31, 31)
  const opc = getBits(instr, 30, 29)
  const shift = getBits(instr, 23, 22)
  const n = getBits(instr, 21, 21)
  const imm6 = getBits(instr, 15, 10)
  const rn = getBits(instr, 9, 5)
  const rd = getBits(instr, 4, 0)

  // ORR (register) with no shift
  if (opc === 0b11 && shift === 0 && n === 0 && imm6 === 0) {
    const is64bit = sf === 1
    return {
      mnemonic: 'mov',
      operands: `${getRegisterName(rd, is64bit)}, ${getRegisterName(rn, is64bit)}`
    }
  }

  return null
}

function disassembleWord(word) {
  // Special cases
  if (word === 0xd503201f) {
    return 'nop'
  }

  if (word === 0xd65f03c0) {
    return 'ret'
  }

  // Try different instruction types
  let result

  result = disassembleBranch(word)
  if (result) {
    return result.operands ? `${result.mnemonic} ${result.operands}` : result.mnemonic
  }

  result = disassembleMovImmediate(word)
  if (result) {
    return `${result.mnemonic} ${result.operands}`
  }

  result = disassembleFloatingPoint(word)
  if (result) {
    return `${result.mnemonic} ${result.operands}`
  }

  result = disassembleRegisterMove(word)
  if (result) {
    return `${result.mnemonic} ${result.operands}`
  }

  // Fallback for unknown instructions
  return `.word 0x${word.toString(16).padStart(8, '0').toUpperCase()}`
}

function asmToHex(assembly) {
  throw new Error('Assembly to Hex conversion is not yet supported. Currently, only hex to ASM disassembly is available.')
}

function hexToAsm(hexString) {
  // Remove all whitespace and 0x prefixes
  const cleanHex = hexString.replace(/\s+/g, '').replace(/0x/gi, '')

  // Convert hex string to bytes array
  const byteArray = []
  for (let i = 0; i < cleanHex.length; i += 2) {
    const byte = cleanHex.substring(i, i + 2)
    if (!/^[0-9a-fA-F]{2}$/.test(byte)) {
      throw new Error('Invalid hexadecimal input')
    }
    byteArray.push(parseInt(byte, 16))
  }

  if (byteArray.length === 0) {
    throw new Error('Please enter hexadecimal bytes')
  }

  if (byteArray.length % WORD_SIZE !== 0) {
    throw new Error('ARM64 instructions must be entered in 4-byte groups')
  }

  // Convert bytes to 32-bit words (little-endian)
  const lines = []
  for (let i = 0; i < byteArray.length; i += WORD_SIZE) {
    const word =
      (byteArray[i] << 0) |
      (byteArray[i + 1] << 8) |
      (byteArray[i + 2] << 16) |
      (byteArray[i + 3] << 24)

    lines.push(disassembleWord(word >>> 0))
  }

  return lines.join('\n')
}

export default {
  asmToHex,
  hexToAsm,
}