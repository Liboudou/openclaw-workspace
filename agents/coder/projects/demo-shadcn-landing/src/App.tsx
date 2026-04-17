import React from "react";
import { ThemeProvider } from "./theme/theme.config";
import MainLayout from "./layouts/MainLayout";
import HeroSection from "./components/HeroSection";
import FeatureGrid from "./components/FeatureGrid";
import InteractiveShowcase from "./components/InteractiveShowcase";
import CallToAction from "./components/CallToAction";
import Footer from "./components/Footer";
import AnimatedBackground from "./components/AnimatedBackground";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <ThemeProvider>
      <AnimatedBackground />
      <MainLayout>
        <Navbar />
        <HeroSection />
        <FeatureGrid />
        <InteractiveShowcase />
        <CallToAction />
        <Footer />
      </MainLayout>
    </ThemeProvider>
  );
}
