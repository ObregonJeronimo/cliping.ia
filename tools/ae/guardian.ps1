# GUARDIAN DE DIALOGOS DE AFTER EFFECTS
#
# POR QUE EXISTE. El canal hacia AE es asincrono y mudo: `AfterFX.exe -r` dispara un script y vuelve
# enseguida, sin traer nada. Cuando algo falla, AE lo dice ABRIENDO UN CARTEL — y ese cartel es modal:
# bloquea la aplicacion entera hasta que una persona toca Aceptar. Con nadie delante de la maquina, un
# cartel congela todo el trabajo y ademas se lleva puesto el unico lugar donde estaba escrito que salio
# mal, porque el texto vive en la pantalla y en ningun archivo.
#
# Este guardian mira las ventanas de AE, ANOTA EL TEXTO DE CADA CARTEL y despues lo cierra. El orden
# importa: primero se guarda lo que dice, despues se acepta. Un cartel aceptado sin leer es informacion
# perdida, que es peor que el bloqueo.
#
# LO QUE NO HACE, A PROPOSITO. Solo cierra carteles de UN SOLO BOTON, o sea los informativos ("no se
# pudo ejecutar el script", "no se ha encontrado el archivo"). Cualquier cosa con dos o mas botones
# —"¿guardar los cambios?", "¿reemplazar el archivo?"— la anota y LA DEJA ABIERTA: elegir por el
# usuario en una pregunta que tiene consecuencias no es tarea de un vigilante. En ese caso el trabajo
# se frena, que es lo correcto, y queda anotado por que.
#
# USO
#   powershell -File tools/ae/guardian.ps1 -Listar
#   powershell -File tools/ae/guardian.ps1 -Vigilar 1800 -Registro C:\ae-probe\carteles.txt

param(
  [switch]$Listar,
  [int]$Vigilar = 0,
  [string]$Registro = "C:\ae-probe\carteles.txt",
  [string]$Parar = "C:\ae-probe\parar-guardian",
  [string]$Latido = "C:\ae-probe\guardian-vivo"
)

Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class VentanasAE {
  public delegate bool Enum(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(Enum f, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr h, Enum f, IntPtr p);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassNameW(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);

  const uint BM_CLICK = 0x00F5;
  const uint GW_OWNER = 4;

  static string Texto(IntPtr h) {
    StringBuilder s = new StringBuilder(1024);
    GetWindowTextW(h, s, 1024);
    return s.ToString();
  }
  static string Clase(IntPtr h) {
    StringBuilder s = new StringBuilder(256);
    GetClassNameW(h, s, 256);
    return s.ToString();
  }

  // UN DIALOGO ES CUALQUIER VENTANA VISIBLE DEL PROCESO QUE NO SEA LA PRINCIPAL.
  //
  // La primera version pedia que la ventana tuviera DUENO, dando por hecho que la unica sin dueno es la
  // ventana principal de AE. Es falso, y el agujero se pago con dos carteles que llegaron al usuario:
  // el error de PARSEO de ExtendScript ("No se puede ejecutar el script en la linea N: constante de
  // cadena incompleta") abre una ventana de nivel superior SIN dueno, asi que el vigilante la salteaba
  // creyendo que era la ventana principal. El vigilante estaba vivo, latiendo y mudo.
  //
  // Es el mismo error que ya esta anotado dos veces en este repo con otro nombre: se probo contra UN
  // caso —un `alert()`, que si tiene dueno— y se dio por cubierta toda la familia. Una compuerta solo
  // protege lo que la atraviesa.
  //
  // Ahora se excluye la ventana principal por HANDLE, que es lo que de verdad la identifica, y el
  // filtro real pasa a ser el de mas abajo: un cartel siempre tiene al menos un boton.
  public static List<IntPtr> Dialogos(uint pid, IntPtr principal) {
    List<IntPtr> res = new List<IntPtr>();
    EnumWindows(delegate(IntPtr h, IntPtr p) {
      uint q; GetWindowThreadProcessId(h, out q);
      if (q != pid) return true;
      if (!IsWindowVisible(h)) return true;
      if (h == principal) return true;
      res.Add(h);
      return true;
    }, IntPtr.Zero);
    return res;
  }

  // El texto de un cartel de Windows no esta en su titulo: esta en sus controles hijos de tipo Static.
  // Los botones son controles de clase Button. Se devuelven las dos cosas separadas porque la decision
  // de cerrar o no depende de CUANTOS botones hay.
  public static string Contenido(IntPtr dlg, out List<IntPtr> botones, out List<string> etiquetas) {
    List<string> textos = new List<string>();
    List<IntPtr> bs = new List<IntPtr>();
    List<string> es = new List<string>();
    EnumChildWindows(dlg, delegate(IntPtr h, IntPtr p) {
      string c = Clase(h), t = Texto(h);
      if (c.IndexOf("Button", StringComparison.OrdinalIgnoreCase) >= 0) {
        if (t.Length > 0 && IsWindowVisible(h) && IsWindowEnabled(h)) { bs.Add(h); es.Add(t); }
      } else if (t.Length > 0) {
        textos.Add(t);
      }
      return true;
    }, IntPtr.Zero);
    botones = bs; etiquetas = es;
    return string.Join(" | ", textos.ToArray());
  }

  public static string Titulo(IntPtr h) { return Texto(h); }
  public static void Clic(IntPtr boton) { SendMessage(boton, BM_CLICK, IntPtr.Zero, IntPtr.Zero); }
}
"@ -ErrorAction Stop

# Write-Host Y NO Write-Output, y no es cosmetico: en PowerShell todo lo que una funcion manda por
# Write-Output SE SUMA A SU VALOR DE RETORNO. Con Write-Output, `$n = RevisarUnaVez $false` devolvia un
# arreglo con las lineas de texto adentro en vez del contador, y entonces `$n -eq 0` era falso y el
# guardian no imprimia nada. El archivo de registro seguia bien, asi que el defecto se veia solo como
# "la consola no dice nada" — un vigilante mudo, que es peor que no tenerlo porque parece que anda.
function Anotar([string]$linea) {
  $marca = (Get-Date).ToString("HH:mm:ss")
  Write-Host "$marca  $linea"
  if ($Registro) { Add-Content -Path $Registro -Value "$marca  $linea" -Encoding utf8 }
}

function RevisarUnaVez([bool]$cerrar) {
  $ae = Get-Process AfterFX -ErrorAction SilentlyContinue
  if (-not $ae) { return 0 }
  $encontrados = 0
  foreach ($d in [VentanasAE]::Dialogos([uint32]$ae.Id, $ae.MainWindowHandle)) {
    $botones = $null; $etiquetas = $null
    $cuerpo = [VentanasAE]::Contenido($d, [ref]$botones, [ref]$etiquetas)
    $titulo = [VentanasAE]::Titulo($d)
    # UN CARTEL SIEMPRE TIENE UN BOTON. After Effects tiene paneles flotantes que tambien son ventanas
    # con dueno y con texto adentro (OS_ViewContainer, OS_EditTextContainer): sin este filtro, el
    # guardian informaba "CARTEL" cada vez que miraba y el aviso perdia todo su valor. Un vigilante que
    # grita siempre es igual de inutil que uno que no grita nunca.
    if ($etiquetas.Count -eq 0) { continue }
    $encontrados++
    Anotar "CARTEL '$titulo' :: $cuerpo"
    Anotar "  botones: $($etiquetas -join ', ')"
    if (-not $cerrar) { continue }
    # UN SOLO BOTON = informativo. Se cierra. Dos o mas = una pregunta con consecuencias: se deja.
    if ($etiquetas.Count -eq 1) {
      [VentanasAE]::Clic($botones[0])
      Anotar "  -> cerrado ('$($etiquetas[0])')"
    } else {
      Anotar "  -> NO SE TOCA: tiene $($etiquetas.Count) botones. Esto frena el trabajo a proposito."
    }
  }
  return $encontrados
}

if ($Listar) {
  $n = RevisarUnaVez $false
  if ($n -eq 0) { Anotar "sin carteles abiertos" }
  exit 0
}

if ($Vigilar -gt 0) {
  if (Test-Path $Parar) { Remove-Item $Parar -Force }
  Anotar "guardian en marcha, hasta $Vigilar s (o hasta que exista $Parar)"
  $fin = (Get-Date).AddSeconds($Vigilar)
  while ((Get-Date) -lt $fin) {
    if (Test-Path $Parar) { Anotar "guardian detenido por pedido"; exit 0 }
    RevisarUnaVez $true | Out-Null
    # EL LATIDO, para que quien vaya a llamar a AE sepa que YA HAY un vigilante puesto y no arranque un
    # segundo. Dos vigilantes no rompen nada —el primero que cierra gana y el otro no encuentra nada—
    # pero el que no cerro tampoco ANOTA, con lo cual su informe sale vacio y parece que no paso nada.
    Set-Content -Path $Latido -Value ((Get-Date).ToString("o")) -Encoding utf8
    Start-Sleep -Milliseconds 400
  }
  if (Test-Path $Latido) { Remove-Item $Latido -Force }
  Anotar "guardian termino por tiempo"
  exit 0
}

Write-Output "uso: -Listar   |   -Vigilar <segundos> [-Registro archivo]"
