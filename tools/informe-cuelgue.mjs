// QUE PASO LA ULTIMA VEZ QUE SE COLGO LA MAQUINA — sin nada corriendo en segundo plano.
//
// POR QUE ASI, y no con un vigilante en vivo:
//
//   La primera idea fue dejar un proceso anotando cada 5 segundos. Funciona, pero es una cosa mas
//   corriendo todo el dia, y Jero lo pidio al reves y con razon: *"que si pasa, se anote algo, pero que
//   no consuma en vivo"*.
//
//   Y resulta que no hace falta, porque WINDOWS YA LO ANOTA SOLO. El detector de agotamiento de
//   recursos (evento 2004) se dispara cuando la memoria virtual se acaba y **nombra al programa
//   culpable**. Estaba ahi todo el tiempo:
//
//     4/8/2026 23:56:15 · 2004 · "condicion de memoria virtual insuficiente ... node.exe"
//
//   El cuelgue fue a las 23:59:52. O sea: tres minutos y medio antes, Windows registro memoria agotada
//   y senalo a node.exe —la cadena de compuertas que habia quedado huerfana—. Y los 17 eventos del
//   25-26 de julio son todos node.exe: la fuga de `getImageData`.
//
//   Lo unico que faltaba era LEERLO y cruzarlo con que estabamos corriendo nosotros. Eso lo aporta el
//   cerrojo: se escribe UNA vez al arrancar algo pesado y se borra al terminar bien. Si sobrevive a un
//   cuelgue, dice exactamente que estaba corriendo. Cero costo en vivo: un archivo al empezar y otro al
//   terminar.
//
// Uso:  npm run informe
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { RUTA, RUTA_ULTIMO } from './lib/cerrojo.mjs'

// `[Console]::OutputEncoding` va SIEMPRE: sin eso PowerShell devuelve la pagina de codigos ANSI y los
// acentos llegan rotos ("result? inesperado", "us? 42155171840 bytes"). Un informe que hay que
// descifrar es un informe que no se lee.
const ps = (cmd) => {
  try {
    return execFileSync('powershell', ['-NoProfile', '-Command',
      '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ' + cmd],
    { encoding: 'utf8', timeout: 30000 }).trim()
  }
  catch (e) { return `(no se pudo leer: ${e.message.split('\n')[0]})` }
}

console.log('\n═══ INFORME DE CUELGUE ═══\n')

// ---------------------------------------------------------------- 1. hubo cuelgue?
const sucios = ps(`Get-WinEvent -FilterHashtable @{LogName='System'; Id=6008} -MaxEvents 5 -ErrorAction SilentlyContinue |`
  + ` ForEach-Object { $_.TimeCreated.ToString('dd/MM HH:mm') + '  ' + ($_.Message -replace "\`r\`n",' ') }`)
console.log('1. CIERRES INESPERADOS (los que terminaron apagando con el boton)\n')
console.log(sucios ? sucios.split('\n').map(l => '   ' + l.trim()).join('\n') : '   ninguno registrado.')

// ---------------------------------------------------------------- 2. fue la memoria?
//
// Esta es LA pregunta, y Windows la contesta solo. El evento 2004 no solo dice que se acabo la memoria:
// dice QUE PROGRAMA se la comio.
const memoria = ps(`Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Resource-Exhaustion-Detector'; StartTime=(Get-Date).AddDays(-30)} -MaxEvents 8 -ErrorAction SilentlyContinue |`
  + ` ForEach-Object { $_.TimeCreated.ToString('dd/MM HH:mm:ss') + '  ' + (($_.Message -replace "\`r\`n",' ') -replace '.*mayor parte de la memoria virtual: ','culpable: ') }`)
console.log('\n\n2. ¿FUE LA MEMORIA? — detector propio de Windows, que ademas nombra al culpable\n')
if (memoria && !memoria.startsWith('(')) {
  console.log(memoria.split('\n').map(l => '   ' + l.trim()).join('\n'))
  console.log('\n   >>> Si hay un renglon MINUTOS ANTES de un cierre inesperado, la causa fue memoria,')
  console.log('       y el nombre que aparece es el que la consumio.')
} else {
  console.log('   NINGUNO en 30 dias. Windows no detecto agotamiento de memoria,')
  console.log('   asi que si igual se colgo, la causa hay que buscarla en otro lado (placa de video).')
}

// ---------------------------------------------------------------- 3. fue la placa de video?
const video = ps("(Get-WinEvent -FilterHashtable @{LogName='System'; Id=4101,4104; StartTime=(Get-Date).AddDays(-30)} -ErrorAction SilentlyContinue | Measure-Object).Count")
console.log('\n\n3. ¿FUE LA PLACA DE VIDEO? — cuantas veces el driver se cayo y se recupero (4101/4104)\n')
console.log(`   ${video} evento(s).`)
console.log('   Ojo con el cero: si la placa se cuelga del TODO no llega ni a registrar su caida,')
console.log('   asi que un cero no la absuelve — solo dice que nunca se recupero sola.')

// ---------------------------------------------------------------- 4. fue hardware?
const whea = ps("(Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WHEA-Logger'; StartTime=(Get-Date).AddDays(-30)} -ErrorAction SilentlyContinue | Measure-Object).Count")
const bug = ps(`Get-WinEvent -FilterHashtable @{LogName='System'; Id=41} -MaxEvents 3 -ErrorAction SilentlyContinue |`
  + ` ForEach-Object { $x=[xml]$_.ToXml(); $d=@{}; $x.Event.EventData.Data | ForEach-Object { $d[$_.Name]=$_.'#text' }; $_.TimeCreated.ToString('dd/MM HH:mm') + '  BugcheckCode=' + $d['BugcheckCode'] }`)
console.log('\n\n4. ¿FUE HARDWARE? — errores WHEA y codigo de pantalla azul\n')
console.log(`   errores WHEA en 30 dias: ${whea}   (cualquier numero distinto de 0 es hardware avisando)`)
console.log(bug ? bug.split('\n').map(l => '   ' + l.trim()).join('\n') : '')
console.log('   BugcheckCode=0 significa que NO hubo pantalla azul: la maquina se colgo, no fallo el kernel.')

// ---------------------------------------------------------------- 5. que estabamos corriendo NOSOTROS
console.log('\n\n5. ¿QUE ESTABA CORRIENDO DE ESTE PROYECTO?\n')
const leer = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null } }
const vivo = existsSync(RUTA) ? leer(RUTA) : null
const ultimo = existsSync(RUTA_ULTIMO) ? leer(RUTA_ULTIMO) : null
if (vivo) console.log(`   AHORA MISMO: "${vivo.quien}" (pid ${vivo.pid}) desde ${vivo.desde}`)
if (ultimo) {
  console.log(`   LA ULTIMA VEZ QUE ALGO QUEDO A MEDIO TERMINAR: "${ultimo.quien}"`)
  console.log(`      arranco ${ultimo.desde} · se descubrio caido ${ultimo.encontradoHuerfano}`)
  console.log('      Si eso coincide con la hora de un cierre inesperado de arriba, ahi tenes la causa.')
} else if (!vivo) {
  console.log('   Nada quedo a medio terminar. Todo lo pesado que se corrio termino bien.')
}

// ---------------------------------------------------------------- 6. estado actual
const hiber = ps("(Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power' -Name HiberbootEnabled -ErrorAction SilentlyContinue).HiberbootEnabled")
console.log('\n\n6. ESTADO DE LA MAQUINA AHORA\n')
console.log(`   ${ps("'{0:N0} MB disponibles de {1:N0}' -f ((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1KB), ((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize/1KB)")}`)
console.log(`   Inicio rapido: ${hiber === '1' ? 'ACTIVADO — "Apagar" no apaga del todo, conviene desactivarlo' : 'desactivado (bien)'}`)
console.log(`   Mas pesados: ${ps("(Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5 | ForEach-Object { \"$($_.ProcessName):$([int]($_.WorkingSet/1MB))MB\" }) -join '  '")}`)
console.log('\n═══════════════════════════\n')
