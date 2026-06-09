import { useNavigate } from 'react-router-dom'
import styles from './Legal.module.css'

export default function Terminos() {
  const navigate = useNavigate()
  const updated = '9 de junio de 2026'

  return (
    <div className={styles.page}>
      <button className={styles.backLogo} onClick={() => navigate('/')} aria-label="Volver al inicio">
        <img src="/logo.svg" alt="" width="26" height="26" />
        <span>cliping<span>.ia</span></span>
      </button>

      <article className={styles.doc}>
        <p className={styles.kicker}>Legal</p>
        <h1 className={styles.title}>Terminos de uso</h1>
        <p className={styles.updated}>Ultima actualizacion: {updated}</p>

        <div className={styles.notice}>
          Este documento es una version preliminar mientras la herramienta esta en
          desarrollo. Sera actualizado antes del lanzamiento definitivo.
        </div>

        <section className={styles.section}>
          <h2>1. Aceptacion de los terminos</h2>
          <p>
            Al crear una cuenta o utilizar cliping.ia (el "Servicio"), aceptas estos
            Terminos de uso. Si no estas de acuerdo con ellos, no debes utilizar el
            Servicio. El uso de cliping.ia implica la aceptacion plena de las
            condiciones aqui descritas.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Descripcion del Servicio</h2>
          <p>
            cliping.ia es una plataforma que genera videos de marketing de forma
            automatizada mediante inteligencia artificial, a partir de la URL de un
            sitio web y de las instrucciones provistas por el usuario. El resultado
            incluye guion, edicion, voz en off y elementos visuales generados o
            seleccionados por la IA.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Registro y cuenta</h2>
          <p>
            Para utilizar el Servicio debes iniciar sesion con una cuenta de Google
            valida. Sos responsable de mantener la confidencialidad de tu cuenta y de
            toda la actividad que ocurra bajo la misma. Debes ser mayor de edad en tu
            jurisdiccion para utilizar cliping.ia.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Planes y pagos</h2>
          <p>
            cliping.ia ofrece un plan gratuito de prueba con un numero limitado de
            videos, y planes pagos (Esencial y Studio) con distintas capacidades y
            limites de generacion. Los planes pagos se facturan de forma mensual o
            anual segun la opcion elegida. Los precios pueden modificarse, notificando
            a los usuarios con antelacion razonable.
          </p>
          <p>
            El plan gratuito puede incluir una marca de agua en los videos generados.
            Las funciones avanzadas de IA estan disponibles unicamente en el plan
            Studio.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Uso aceptable</h2>
          <p>
            Te comprometes a no utilizar el Servicio para generar contenido ilegal,
            difamatorio, que infrinja derechos de terceros, que vulnere propiedad
            intelectual, o que promueva actividades prohibidas. cliping.ia se reserva
            el derecho de suspender cuentas que incumplan estas condiciones.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Propiedad del contenido</h2>
          <p>
            Conservas los derechos sobre el contenido que ingresas (URL, instrucciones,
            material de tu marca) y sobre los videos generados a partir de tus
            indicaciones, dentro de los limites de tu plan. cliping.ia no reclama
            propiedad sobre tus videos finales, pero conserva los derechos sobre la
            plataforma, su tecnologia y sus modelos.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Disponibilidad y limitaciones</h2>
          <p>
            El Servicio se ofrece "tal cual", sin garantias de disponibilidad
            ininterrumpida. Al tratarse de generacion automatizada con IA, los
            resultados pueden variar y no se garantiza que cada video cumpla
            exactamente con las expectativas del usuario.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Limitacion de responsabilidad</h2>
          <p>
            En la maxima medida permitida por la ley, cliping.ia no sera responsable
            por daños indirectos, perdida de ingresos o de datos derivados del uso o la
            imposibilidad de uso del Servicio.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Cambios en los terminos</h2>
          <p>
            Podemos actualizar estos Terminos periodicamente. Los cambios significativos
            seran notificados a traves del Servicio. El uso continuado luego de una
            actualizacion implica la aceptacion de los nuevos terminos.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Contacto</h2>
          <p>
            Ante cualquier consulta sobre estos Terminos, podes contactarnos a traves de
            los canales oficiales de cliping.ia.
          </p>
        </section>
      </article>
    </div>
  )
}
