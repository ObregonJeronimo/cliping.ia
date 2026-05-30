import {Composition} from 'remotion';
import {MarketingVideo} from './compositions/MarketingVideo';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MarketingVideo"
        component={MarketingVideo}
        durationInFrames={990} // 33 segundos a 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          siteName: "ConsulPay",
          headline: "Gestioná tu consultorio desde un solo lugar",
          benefits: [
            "Administrá profesionales y pacientes",
            "Controlá sesiones y pagos",
            "Todo en tiempo real"
          ],
          cta: "Creá tu consultorio gratis",
          primaryColor: "#6366f1",
          secondaryColor: "#818cf8",
          accentColor: "#f0f9ff",
          screenshotUrl: null,
          logoUrl: null,
        }}
      />
    </>
  );
};
