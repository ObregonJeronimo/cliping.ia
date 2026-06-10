import { useNavigate } from 'react-router-dom'
import styles from './Legal.module.css'

export default function Privacidad() {
  const navigate = useNavigate()
  const updated = '10 de junio de 2026'

  return (
    <div className={styles.page}>
      <button className={styles.backLogo} onClick={() => navigate('/')} aria-label="Volver al inicio">
        <img src="/logo.svg" alt="" width="26" height="26" />
        <span>Ur<span>vid</span></span>
      </button>

      <article className={styles.doc}>
        <p className={styles.kicker}>Legal</p>
        <h1 className={styles.title}>Politica de privacidad</h1>
        <p className={styles.updated}>Ultima actualizacion: {updated}</p>

        <div className={styles.notice}>
          Este documento es una version preliminar mientras la herramienta esta en
          desarrollo. Sera actualizado antes del lanzamiento definitivo.
        </div>

        <section className={styles.section}>
          <h2>1. Informacion que recopilamos</h2>
          <p>
            Cuando usas Urvid recopilamos: (a) datos de tu cuenta de Google
            necesarios para autenticarte, como nombre, correo electronico e imagen de
            perfil; (b) las URL e instrucciones que ingresas para generar videos;
            (c) datos de uso del Servicio, como cantidad de videos generados y
            preferencias; y (d) informacion tecnica basica como tipo de navegador y
            dispositivo.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Como usamos tu informacion</h2>
          <p>
            Utilizamos tus datos para: prestar y mejorar el Servicio, generar los videos
            solicitados, administrar tu cuenta y tu plan, comunicarnos contigo sobre
            actualizaciones, y cumplir obligaciones legales. No vendemos tu informacion
            personal a terceros.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Procesamiento mediante inteligencia artificial</h2>
          <p>
            Para generar los videos, el contenido de la URL y tus instrucciones se
            procesan mediante modelos de IA, propios y de proveedores externos. Este
            procesamiento se limita a lo necesario para entregar el resultado
            solicitado.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Proveedores externos</h2>
          <p>
            Urvid se apoya en servicios de terceros para funcionar, como
            autenticacion (Google), infraestructura de alojamiento y procesamiento, y
            servicios de modelos de IA. Estos proveedores solo acceden a la informacion
            necesaria para prestar su funcion y estan sujetos a sus propias politicas.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Almacenamiento y seguridad</h2>
          <p>
            Aplicamos medidas razonables para proteger tu informacion. Los datos se
            conservan mientras tu cuenta este activa o mientras sean necesarios para
            prestar el Servicio. Podes solicitar la eliminacion de tu cuenta y datos
            asociados.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Tus derechos</h2>
          <p>
            Podes acceder, corregir o eliminar tu informacion personal, y solicitar
            informacion sobre como la tratamos. Para ejercer estos derechos, contactanos
            a traves de los canales oficiales de Urvid.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Cookies</h2>
          <p>
            Utilizamos cookies y tecnologias similares estrictamente necesarias para el
            funcionamiento del Servicio y para recordar tu sesion. No utilizamos cookies
            de publicidad de terceros.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Datos corporativos y uso de marca</h2>
          <p>
            Cuando te registras con un correo de dominio corporativo, asociamos tu
            cuenta a la organizacion correspondiente a ese dominio. Esta informacion
            puede usarse, segun lo previsto en la seccion 9 de los Terminos de uso
            ("Uso de marcas y logotipos"), para identificar que equipos de esa
            organizacion utilizan el Servicio y para incluir el nombre o logotipo de la
            organizacion en materiales de marketing.
          </p>
          <p>
            La organizacion o el usuario pueden solicitar la baja de este uso en
            cualquier momento contactando a Urvid a traves de sus canales oficiales,
            tras lo cual dejaremos de utilizar dicha marca en nuevos materiales en un
            plazo razonable.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Cambios en esta politica</h2>
          <p>
            Podemos actualizar esta Politica de privacidad periodicamente. Los cambios
            significativos seran notificados a traves del Servicio.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Contacto</h2>
          <p>
            Ante cualquier consulta sobre el tratamiento de tus datos, podes contactarnos
            a traves de los canales oficiales de Urvid.
          </p>
        </section>
      </article>
    </div>
  )
}
