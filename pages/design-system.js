import React from 'react';
import Head from 'next/head';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export default function DesignSystemPreview() {
  return (
    <div className="min-h-screen p-8 md:p-16 max-w-5xl mx-auto space-y-16">
      <Head>
        <title>Industrial UI Preview</title>
      </Head>

      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 drop-shadow-[0_1px_1px_#ffffff]">
          Industrial Skeuomorphism
        </h1>
        <p className="text-slate-500 max-w-2xl text-lg">
          A tactile, physically-grounded component library adapted to the Kisan Setu emerald brand.
        </p>
      </div>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-700">Physical Keys (Buttons)</h2>
        <div className="flex flex-wrap gap-6 items-center p-8 bg-[var(--chassis)] rounded-3xl shadow-recessed border border-white/50">
          <Button variant="primary">Generate OTP</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="ghost">Learn More</Button>
          
          <Button variant="primary" size="icon">
            <span className="text-xl">+</span>
          </Button>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-700">Data Slots (Inputs)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-[var(--chassis)] rounded-3xl shadow-recessed border border-white/50">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Aadhaar Number</label>
            <Input placeholder="XXXX XXXX XXXX" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">OTP Code</label>
            <Input placeholder="• • • • • •" type="password" />
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-700">Bolted Modules (Cards)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card withScrews={true} withVents={true}>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-[var(--chassis)] shadow-floating flex items-center justify-center text-emerald-600 font-bold">
                01
              </div>
              <h3 className="text-xl font-bold">Standard Panel</h3>
              <p className="text-slate-500">
                Notice the hardware mounting screws in the corners and the ventilation slots in the top right. 
                Hover over this card to see the physical lift.
              </p>
            </div>
          </Card>
          
          <Card elevated={true} withScrews={false}>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-600 shadow-glow flex items-center justify-center text-white font-bold">
                02
              </div>
              <h3 className="text-xl font-bold">Elevated Module</h3>
              <p className="text-slate-500">
                This card starts with a higher elevation shadow. Without screws, it looks more like a floating interactive surface rather than a bolted panel.
              </p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
