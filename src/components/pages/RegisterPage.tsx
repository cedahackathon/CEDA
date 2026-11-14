/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { BOTSWANA_DISTRICTS } from '../../config/districts';
import { evaluatePassword } from '../../services/passwordPolicy';
import { AccountType, VerificationChannel } from '../../types/auth';

export const RegisterPage: React.FC = () => {
  const { setCurrentRoute, language } = useAuth();

  // Form Fields
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [omangOrPassport, setOmangOrPassport] = useState('');
  const [dob, setDob] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Gaborone City Council');
  const [selectedTown, setSelectedTown] = useState('Gaborone');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationChannel, setVerificationChannel] = useState<VerificationChannel>('sms');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bdpaConsent, setBdpaConsent] = useState(false);

  // Business specific fields
  const [tradingName, setTradingName] = useState('');
  const [cipaNumber, setCipaNumber] = useState('');
  const [bursTin, setBursTin] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOmangTooltip, setShowOmangTooltip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Field Touched / Blur Tracking
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Inline Field Validations
  const isFirstNameValid = firstName.trim().length >= 2;
  const isSurnameValid = surname.trim().length >= 2;
  const isOmangValid = omangOrPassport.trim().length >= 8;
  const isDobValid = Boolean(dob);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPhoneValid = /^[0-9]{8}$/.test(phone.trim().replace(/\s/g, ''));
  const isBusinessValid =
    accountType === 'individual' ||
    (tradingName.trim().length >= 3 &&
      cipaNumber.trim().length >= 5 &&
      bursTin.trim().length >= 5);

  const pwdEvaluation = evaluatePassword(password, {
    firstName,
    surname,
    email,
  });

  const isConfirmMatch = password.length > 0 && password === confirmPassword;

  const isFormValid =
    isFirstNameValid &&
    isSurnameValid &&
    isOmangValid &&
    isDobValid &&
    isEmailValid &&
    isPhoneValid &&
    isBusinessValid &&
    pwdEvaluation.isValid &&
    isConfirmMatch &&
    bdpaConsent;

  // Selected district towns
  const currentDistrictObj = BOTSWANA_DISTRICTS.find((d) => d.name === selectedDistrict);
  const availableTowns = currentDistrictObj ? currentDistrictObj.towns : ['Gaborone', 'Francistown', 'Maun'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Mark all as touched
    setTouched({
      firstName: true,
      surname: true,
      omangOrPassport: true,
      dob: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      tradingName: true,
      cipaNumber: true,
      bursTin: true,
    });

    if (!isFormValid) {
      setServerError('Please correct all validation errors marked in red before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.register({
        accountType,
        firstName,
        surname,
        omangOrPassport,
        dob,
        email,
        phone,
        district: selectedDistrict,
        town: selectedTown,
        tradingName: accountType === 'business' ? tradingName : undefined,
        cipaNumber: accountType === 'business' ? cipaNumber : undefined,
        bursTin: accountType === 'business' ? bursTin : undefined,
        verificationChannel,
        password,
        confirmPassword,
        bdpaConsent,
      });

      // Successful registration: Route to OTP verification with identifier & Firebase tracking params
      const target = verificationChannel === 'sms' ? phone : email;
      const vIdParam = response.verificationId ? `&vid=${encodeURIComponent(response.verificationId)}` : '';
      const emailSentParam = response.isEmailVerificationSent ? `&emailSent=true` : '';
      setCurrentRoute(`/otp-verification?target=${encodeURIComponent(target)}&channel=${verificationChannel}&code=${response.demoOtpCode}${vIdParam}${emailSentParam}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] bg-[#fdf9f4] py-8 lg:py-12">
      {/* Invisible container for Firebase Phone Auth reCAPTCHA */}
      <div id="recaptcha-container" aria-hidden="true" className="invisible fixed top-0 left-0"></div>
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        {/* Breadcrumb & Security Trust Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-xs text-[#5a413c]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentRoute('/')}
              className="hover:text-[#a02010] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Home</span>
            </button>
            <span className="text-[#8d706b]/40">›</span>
            <span className="font-semibold text-[#1c1c19]">Innovator Registration</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-xs border border-[#e2bfb8]/60 text-[#77574e]">
            <span className="material-symbols-outlined text-[16px] text-[#2e7d32]">verified_user</span>
            <span>256-Bit SSL Encrypted • BDPA Compliant</span>
          </div>
        </div>

        {/* Main Split Grid (40% Left Panel / 60% Form Panel) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 items-stretch shadow-md rounded-2xl overflow-hidden bg-white border border-[#e2bfb8]">
          {/* LEFT 40% DARK INSTITUTIONAL PANEL */}
          <section className="lg:col-span-5 bg-[#31302d] text-[#f4f0eb] p-6 lg:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Kalahari Mineral Glow */}
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#a02010]/20 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#943100]/25 blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col">
              {/* Brand Lockup */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/assets/ceda-logo.png"
                  alt="CEDA Logo"
                  className="h-10 w-auto object-contain bg-white/95 p-1 rounded-lg"
                />
                <div className="flex flex-col border-l border-white/20 pl-2.5">
                  <span className="font-headline text-xs font-bold uppercase tracking-wider text-white">
                    Innovation Portal
                  </span>
                  <span className="text-[10px] text-amber-300 font-semibold tracking-widest uppercase">
                    Republic of Botswana
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <span className="inline-block px-3 py-1 rounded-full bg-[#943100]/50 text-[#ffdbcf] text-xs font-bold uppercase tracking-wider mb-2">
                  Portal Onboarding
                </span>
                <h1 className="font-headline text-2xl lg:text-3xl text-white font-bold leading-tight">
                  Join the CEDA Innovation Community
                </h1>
                <p className="text-xs text-[#f4f0eb]/80 mt-2 leading-relaxed">
                  Submit ground-breaking commercial, agricultural, and technological solutions to receive
                  catalytic non-repayable grants, mezzanine debt, and incubation mentorship.
                </p>
              </div>

              {/* Core Trust Highlights */}
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="w-9 h-9 rounded-lg bg-[#a02010] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">insights</span>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-xs font-bold text-white">Track your idea in real time</h2>
                    <p className="text-[11px] text-[#f4f0eb]/70 mt-0.5 leading-snug">
                      Transparent 5-stage evaluation lifecycle from initial CIPA screening to final Investment Board award.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="w-9 h-9 rounded-lg bg-[#943100] flex items-center justify-center text-[#ffdbcf] shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">rate_review</span>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-xs font-bold text-white">Get expert feedback</h2>
                    <p className="text-[11px] text-[#f4f0eb]/70 mt-0.5 leading-snug">
                      Direct evaluation dossiers and commercial scaling insights from accredited Botswana industry panels.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="w-9 h-9 rounded-lg bg-[#77574e] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-xs font-bold text-white">Your ideas are protected</h2>
                    <p className="text-[11px] text-[#f4f0eb]/70 mt-0.5 leading-snug">
                      Strict IP non-disclosure protocols governed by the Botswana Data Protection Act (BDPA) and CIPA guidelines.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Left Panel Footer: Mandate Quote */}
            <div className="relative z-10 pt-8 mt-8 border-t border-white/10 flex flex-col gap-2">
              <div className="p-3 rounded-lg bg-white/5 text-xs text-[#f4f0eb]/80 italic">
                "Empowering Batswana innovators across all 10 administrative districts — from Ngamiland to Kgalagadi."
              </div>
              <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold tracking-wide">
                <span>FINANCE • DEVELOP • SUSTAIN</span>
                <span>#KaeKapaKae</span>
              </div>
            </div>
          </section>

          {/* RIGHT 60% REGISTRATION FORM */}
          <section className="lg:col-span-7 bg-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#77574e] uppercase tracking-wider">
                    Applicant Profile (Citizen Intake)
                  </span>
                  <span className="text-xs font-bold text-[#a02010]">Public Registration</span>
                </div>
                <h2 className="font-headline text-2xl font-bold text-[#7c0700]">
                  Create your account
                </h2>
                <p className="text-xs text-[#5a413c] mt-1">
                  Start your innovation submission journey. Required fields are marked with{' '}
                  <span className="text-[#ba1a1a] font-medium">*</span>.
                </p>
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-3 shadow-xs animate-in fade-in"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#ba1a1a] shrink-0 mt-0.5">
                    error
                  </span>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <span className="font-bold text-red-950">Registration Notice</span>
                    <span className="text-red-800 leading-relaxed">{serverError}</span>
                    {serverError.includes('already registered') && (
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setCurrentRoute(`/login?email=${encodeURIComponent(email)}`)}
                          className="px-3 py-1.5 bg-[#a02010] text-white rounded-lg font-bold hover:bg-[#861a0d] transition-colors cursor-pointer text-xs"
                        >
                          Go to Log In
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentRoute(`/forgot-password?email=${encodeURIComponent(email)}`)}
                          className="px-3 py-1.5 bg-white border border-[#e2bfb8] text-[#5a413c] rounded-lg font-bold hover:bg-[#f7f3ee] transition-colors cursor-pointer text-xs"
                        >
                          Reset Password
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                {/* 1. Account Type Toggle (Individual | Business or Group) */}
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="text-xs font-bold text-[#1c1c19] flex items-center justify-between">
                    <span>
                      Account Type <span className="text-[#ba1a1a]">*</span>
                    </span>
                    <span className="text-[11px] text-[#77574e] font-normal">
                      Select entity structure
                    </span>
                  </legend>
                  <div className="grid grid-cols-2 p-1 bg-[#f1ede8] rounded-xl gap-1 max-w-md border border-[#e2bfb8]/50">
                    <button
                      type="button"
                      onClick={() => setAccountType('individual')}
                      className={`h-10 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        accountType === 'individual'
                          ? 'bg-white text-[#7c0700] shadow-sm'
                          : 'text-[#5a413c] hover:text-[#1c1c19]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      <span>Individual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('business')}
                      className={`h-10 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        accountType === 'business'
                          ? 'bg-white text-[#7c0700] shadow-sm'
                          : 'text-[#5a413c] hover:text-[#1c1c19]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">domain</span>
                      <span>Business or group</span>
                    </button>
                  </div>
                </fieldset>

                {/* 2. Names (First Name & Surname) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-first-name" className="text-xs font-bold text-[#1c1c19]">
                      First name <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        onBlur={() => markTouched('firstName')}
                        placeholder="e.g. Kagiso"
                        required
                        className={`w-full h-11 px-3.5 rounded-lg bg-[#f7f3ee] text-xs font-medium text-[#1c1c19] border ${
                          touched.firstName && !isFirstNameValid
                            ? 'border-2 border-[#ba1a1a] bg-red-50/20'
                            : 'border-[#e2bfb8]/60 focus:bg-white'
                        }`}
                      />
                      {touched.firstName && (
                        <span className="absolute right-3 top-3 text-[18px]">
                          {isFirstNameValid ? (
                            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[#ba1a1a]">error</span>
                          )}
                        </span>
                      )}
                    </div>
                    {touched.firstName && !isFirstNameValid && (
                      <p className="text-[11px] text-[#ba1a1a] mt-0.5">First name is required.</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-surname" className="text-xs font-bold text-[#1c1c19]">
                      Surname <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-surname"
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        onBlur={() => markTouched('surname')}
                        placeholder="e.g. Mogae"
                        required
                        className={`w-full h-11 px-3.5 rounded-lg bg-[#f7f3ee] text-xs font-medium text-[#1c1c19] border ${
                          touched.surname && !isSurnameValid
                            ? 'border-2 border-[#ba1a1a] bg-red-50/20'
                            : 'border-[#e2bfb8]/60 focus:bg-white'
                        }`}
                      />
                      {touched.surname && (
                        <span className="absolute right-3 top-3 text-[18px]">
                          {isSurnameValid ? (
                            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[#ba1a1a]">error</span>
                          )}
                        </span>
                      )}
                    </div>
                    {touched.surname && !isSurnameValid && (
                      <p className="text-[11px] text-[#ba1a1a] mt-0.5">Surname is required.</p>
                    )}
                  </div>
                </div>

                {/* 3. Omang Number or Passport Number with Tooltip */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="reg-omang" className="text-xs font-bold text-[#1c1c19] flex items-center gap-1.5">
                      <span>Omang or Passport number</span>
                      <span className="text-[#ba1a1a]">*</span>
                    </label>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowOmangTooltip(!showOmangTooltip)}
                        className="text-xs text-[#77574e] hover:text-[#7c0700] flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        <span>Identity Guide</span>
                      </button>

                      {showOmangTooltip && (
                        <div className="absolute right-0 top-6 z-30 w-72 p-3 bg-[#31302d] text-[#f4f0eb] rounded-xl shadow-xl text-xs">
                          <p className="font-bold text-amber-300 mb-1">National ID Standards</p>
                          <p className="text-[11px] leading-relaxed">
                            Citizens provide 9-digit Omang number (
                            <code className="text-[#ffdbcf]">XXXX1XXXX</code> for male /{' '}
                            <code className="text-[#ffdbcf]">XXXX2XXXX</code> for female); foreign directors provide valid Passport number.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#77574e]">
                      <span className="material-symbols-outlined text-[18px]">badge</span>
                    </span>
                    <input
                      id="reg-omang"
                      type="text"
                      value={omangOrPassport}
                      onChange={(e) => setOmangOrPassport(e.target.value)}
                      onBlur={() => markTouched('omangOrPassport')}
                      placeholder="e.g. 482115904"
                      required
                      className={`w-full h-11 pl-10 pr-10 rounded-lg bg-[#f7f3ee] text-xs font-mono font-medium text-[#1c1c19] border ${
                        touched.omangOrPassport && !isOmangValid
                          ? 'border-2 border-[#ba1a1a] bg-red-50/20'
                          : 'border-[#e2bfb8]/60 focus:bg-white'
                      }`}
                    />
                    {touched.omangOrPassport && (
                      <span className="absolute right-3 top-3 text-[18px]">
                        {isOmangValid ? (
                          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                        ) : (
                          <span className="material-symbols-outlined text-[#ba1a1a]">error</span>
                        )}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#5a413c]">
                    Verified with the Department of Civil and National Registration.
                  </span>
                </div>

                {/* 4. Date of Birth & District / Town */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-dob" className="text-xs font-bold text-[#1c1c19]">
                      Date of birth <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                      id="reg-dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      onBlur={() => markTouched('dob')}
                      required
                      className="w-full h-11 px-3 rounded-lg bg-[#f7f3ee] text-xs font-medium text-[#1c1c19] border border-[#e2bfb8]/60 focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-district" className="text-xs font-bold text-[#1c1c19]">
                      District <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <select
                      id="reg-district"
                      value={selectedDistrict}
                      onChange={(e) => {
                        setSelectedDistrict(e.target.value);
                        const dist = BOTSWANA_DISTRICTS.find((d) => d.name === e.target.value);
                        if (dist && dist.towns.length > 0) {
                          setSelectedTown(dist.towns[0]);
                        }
                      }}
                      className="w-full h-11 px-3 rounded-lg bg-[#f7f3ee] text-xs font-medium text-[#1c1c19] border border-[#e2bfb8]/60 focus:bg-white"
                    >
                      {BOTSWANA_DISTRICTS.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-town" className="text-xs font-bold text-[#1c1c19]">
                      Town / Village <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <select
                      id="reg-town"
                      value={selectedTown}
                      onChange={(e) => setSelectedTown(e.target.value)}
                      className="w-full h-11 px-3 rounded-lg bg-[#f7f3ee] text-xs font-medium text-[#1c1c19] border border-[#e2bfb8]/60 focus:bg-white"
                    >
                      {availableTowns.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Business Fields (If Business Account Selected) */}
                {accountType === 'business' && (
                  <div className="p-4 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8] flex flex-col gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#a02010]">domain</span>
                      <span className="text-xs font-bold text-[#1c1c19] uppercase tracking-wider">
                        Enterprise &amp; Compliance Details
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="reg-trading-name" className="text-xs font-bold text-[#1c1c19]">
                        Registered Trading Name <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <input
                        id="reg-trading-name"
                        type="text"
                        value={tradingName}
                        onChange={(e) => setTradingName(e.target.value)}
                        onBlur={() => markTouched('tradingName')}
                        placeholder="e.g. Kalahari Eco-Tech Solutions (Pty) Ltd"
                        className="w-full h-10 px-3 rounded-lg bg-white text-xs border border-[#e2bfb8]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="reg-cipa" className="text-xs font-bold text-[#1c1c19]">
                          CIPA Company Number <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <input
                          id="reg-cipa"
                          type="text"
                          value={cipaNumber}
                          onChange={(e) => setCipaNumber(e.target.value)}
                          onBlur={() => markTouched('cipaNumber')}
                          placeholder="e.g. BW0000128945"
                          className="w-full h-10 px-3 rounded-lg bg-white text-xs font-mono border border-[#e2bfb8]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="reg-tin" className="text-xs font-bold text-[#1c1c19]">
                          BURS TIN (Tax Number) <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <input
                          id="reg-tin"
                          type="text"
                          value={bursTin}
                          onChange={(e) => setBursTin(e.target.value)}
                          onBlur={() => markTouched('bursTin')}
                          placeholder="e.g. C0008492019"
                          className="w-full h-10 px-3 rounded-lg bg-white text-xs font-mono border border-[#e2bfb8]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Contact (Email & Phone) with INLINE BLUR VALIDATION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-email" className="text-xs font-bold text-[#1c1c19] flex items-center justify-between">
                      <span>Email address <span className="text-[#ba1a1a]">*</span></span>
                      {touched.email && !isEmailValid && (
                        <span className="text-[10px] text-[#ba1a1a] font-semibold">Action required</span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#77574e]">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                      </span>
                      <input
                        id="reg-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (serverError) setServerError(null);
                        }}
                        onBlur={() => markTouched('email')}
                        placeholder="e.g. name@domain.co.bw"
                        required
                        className={`w-full h-11 pl-10 pr-10 rounded-lg text-xs font-medium text-[#1c1c19] border ${
                          touched.email && !isEmailValid
                            ? 'border-2 border-[#ba1a1a] bg-red-50/20'
                            : 'border-[#e2bfb8]/60 bg-[#f7f3ee] focus:bg-white'
                        }`}
                      />
                      {touched.email && (
                        <span className="absolute right-3 top-3 text-[18px]">
                          {isEmailValid ? (
                            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[#ba1a1a]">error</span>
                          )}
                        </span>
                      )}
                    </div>
                    {touched.email && !isEmailValid && (
                      <p className="flex items-center gap-1 text-[11px] text-[#ba1a1a] mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        <span>Please enter a valid email address (e.g. name@domain.co.bw or name@gmail.com)</span>
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-phone" className="text-xs font-bold text-[#1c1c19] flex items-center justify-between">
                      <span>Phone number <span className="text-[#ba1a1a]">*</span></span>
                      {touched.phone && !isPhoneValid && (
                        <span className="text-[10px] text-[#ba1a1a] font-semibold">8 digits required</span>
                      )}
                    </label>
                    <div className="relative">
                      <div className={`flex rounded-lg overflow-hidden border ${
                        touched.phone && !isPhoneValid
                          ? 'border-2 border-[#ba1a1a] bg-red-50/20'
                          : 'border-[#e2bfb8]/60 bg-[#f7f3ee] focus-within:bg-white focus-within:border-[#a02010]'
                      }`}>
                        <div className="inline-flex items-center gap-1 px-3 bg-[#e6e2dd] text-xs font-bold text-[#1c1c19] border-r border-[#e2bfb8]/60 select-none">
                          <span>🇧🇼</span>
                          <span>+267</span>
                        </div>
                        <input
                          id="reg-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                          onBlur={() => markTouched('phone')}
                          placeholder="7X XXX XXX"
                          maxLength={8}
                          required
                          className="flex-1 h-11 px-3 pr-10 text-xs font-medium text-[#1c1c19] bg-transparent outline-none"
                        />
                      </div>
                      {touched.phone && (
                        <span className="absolute right-3 top-3 text-[18px]">
                          {isPhoneValid ? (
                            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-[#ba1a1a]">error</span>
                          )}
                        </span>
                      )}
                    </div>
                    {touched.phone && !isPhoneValid ? (
                      <p className="flex items-center gap-1 text-[11px] text-[#ba1a1a] mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        <span>Please enter an 8-digit Botswana mobile number (e.g. 71234567, 72000000)</span>
                      </p>
                    ) : (
                      <span className="text-[11px] text-[#5a413c]">
                        Supported via Mascom, Orange, and BTC Mobile networks.
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. Verification Channel Radio (SMS default vs Email) */}
                <fieldset className="flex flex-col gap-1.5 pt-1">
                  <legend className="text-xs font-bold text-[#1c1c19]">
                    Account verification channel <span className="text-[#ba1a1a]">*</span>
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        verificationChannel === 'sms'
                          ? 'border-2 border-[#a02010] bg-[#ffd3c8]/20 shadow-xs'
                          : 'border-[#e2bfb8] bg-[#f7f3ee] hover:bg-white text-[#5a413c]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="channel"
                        checked={verificationChannel === 'sms'}
                        onChange={() => setVerificationChannel('sms')}
                        className="mt-0.5 accent-[#a02010] w-4 h-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#1c1c19] flex items-center gap-1">
                          <span>SMS (Fastest)</span>
                          <span className="text-[10px] text-[#a02010] font-semibold">(Recommended)</span>
                        </span>
                        <span className="text-[11px] text-[#5a413c]">
                          Instant 6-digit OTP dispatched to your Botswana SIM.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        verificationChannel === 'email'
                          ? 'border-2 border-[#a02010] bg-[#ffd3c8]/20 shadow-xs'
                          : 'border-[#e2bfb8] bg-[#f7f3ee] hover:bg-white text-[#5a413c]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="channel"
                        checked={verificationChannel === 'email'}
                        onChange={() => setVerificationChannel('email')}
                        className="mt-0.5 accent-[#a02010] w-4 h-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#1c1c19]">Email confirmation</span>
                        <span className="text-[11px] text-[#5a413c]">
                          Secure 6-digit OTP delivered directly to your inbox.
                        </span>
                      </div>
                    </label>
                  </div>
                </fieldset>

                {/* 7. Password & Confirm with Live Strength Meter & Rules */}
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-pwd" className="text-xs font-bold text-[#1c1c19] flex items-center justify-between">
                      <span>Password <span className="text-[#ba1a1a]">*</span></span>
                      <span className="text-[11px] text-[#77574e]">Minimum 10 characters</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-pwd"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => markTouched('password')}
                        placeholder="Create strong password"
                        required
                        className="w-full h-11 px-3.5 pr-11 rounded-lg bg-[#f7f3ee] text-xs font-medium text-[#1c1c19] border border-[#e2bfb8]/60 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-[#77574e] hover:text-[#1c1c19]"
                        aria-label="Toggle password visibility"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>

                    {/* 3-Segment Strength Meter */}
                    <div className="mt-2 flex flex-col gap-1">
                      <div className="grid grid-cols-3 gap-2 h-1.5 w-full">
                        <div
                          className={`h-full rounded-full transition-colors ${
                            pwdEvaluation.strength === 'weak'
                              ? 'bg-[#ba1a1a]'
                              : pwdEvaluation.strength === 'fair' || pwdEvaluation.strength === 'strong'
                              ? 'bg-amber-500'
                              : 'bg-[#e6e2dd]'
                          }`}
                        ></div>
                        <div
                          className={`h-full rounded-full transition-colors ${
                            pwdEvaluation.strength === 'fair'
                              ? 'bg-amber-500'
                              : pwdEvaluation.strength === 'strong'
                              ? 'bg-[#2e7d32]'
                              : 'bg-[#e6e2dd]'
                          }`}
                        ></div>
                        <div
                          className={`h-full rounded-full transition-colors ${
                            pwdEvaluation.strength === 'strong' ? 'bg-[#2e7d32]' : 'bg-[#e6e2dd]'
                          }`}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5 text-[11px]">
                        <span className="text-[#5a413c]">
                          10+ characters with uppercase, lowercase, number and symbol
                        </span>
                        <span
                          className={`font-bold capitalize ${
                            pwdEvaluation.strength === 'strong'
                              ? 'text-emerald-700'
                              : pwdEvaluation.strength === 'fair'
                              ? 'text-amber-600'
                              : 'text-[#ba1a1a]'
                          }`}
                        >
                          {pwdEvaluation.strength}
                        </span>
                      </div>
                    </div>

                    {/* Rules Checklist */}
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2 pt-2 text-[11px]">
                      <div
                        className={`flex items-center gap-1.5 ${
                          pwdEvaluation.rules.hasMinLength ? 'text-emerald-700 font-semibold' : 'text-[#77574e]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {pwdEvaluation.rules.hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>10+ characters</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          pwdEvaluation.rules.hasUpper ? 'text-emerald-700 font-semibold' : 'text-[#77574e]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {pwdEvaluation.rules.hasUpper ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Uppercase letter</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          pwdEvaluation.rules.hasNumber ? 'text-emerald-700 font-semibold' : 'text-[#77574e]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {pwdEvaluation.rules.hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Number included</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          pwdEvaluation.rules.hasSymbol ? 'text-emerald-700 font-semibold' : 'text-[#77574e]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {pwdEvaluation.rules.hasSymbol ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Special symbol (!@#$%^&amp;*)</span>
                      </div>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-confirm-pwd" className="text-xs font-bold text-[#1c1c19] flex items-center justify-between">
                      <span>Confirm password <span className="text-[#ba1a1a]">*</span></span>
                      {touched.confirmPassword && (
                        <span
                          className={`text-[11px] font-semibold ${
                            isConfirmMatch ? 'text-emerald-700' : 'text-[#ba1a1a]'
                          }`}
                        >
                          {isConfirmMatch ? 'Passwords match ✓' : 'Passwords do not match'}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        id="reg-confirm-pwd"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => markTouched('confirmPassword')}
                        placeholder="Re-enter password"
                        required
                        className={`w-full h-11 px-3.5 pr-11 rounded-lg text-xs font-medium text-[#1c1c19] border ${
                          touched.confirmPassword && !isConfirmMatch
                            ? 'border-2 border-[#ba1a1a] bg-red-50/20'
                            : 'border-[#e2bfb8]/60 bg-[#f7f3ee] focus:bg-white'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-[#77574e] hover:text-[#1c1c19]"
                        aria-label="Toggle confirm password visibility"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 8. BDPA Statutory Consent Checkbox */}
                <div className="p-3.5 rounded-xl bg-[#f7f3ee] border border-[#e2bfb8]/70 flex items-start gap-3 mt-1">
                  <input
                    id="reg-consent"
                    type="checkbox"
                    checked={bdpaConsent}
                    onChange={(e) => setBdpaConsent(e.target.checked)}
                    required
                    className="mt-0.5 accent-[#a02010] w-4 h-4 cursor-pointer shrink-0"
                  />
                  <label htmlFor="reg-consent" className="text-xs text-[#1c1c19] leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setCurrentRoute('/terms-of-service')}
                      className="text-[#a02010] underline font-medium hover:text-[#7c0700]"
                    >
                      Terms of Service
                    </button>{' '}
                    and the{' '}
                    <button
                      type="button"
                      onClick={() => setCurrentRoute('/privacy-notice')}
                      className="text-[#a02010] underline font-medium hover:text-[#7c0700]"
                    >
                      Privacy Notice
                    </button>
                    , and I consent to CEDA processing my personal and enterprise submission data in strict accordance with the{' '}
                    <strong className="text-[#1c1c19]">
                      Data Protection Act, 2024 (Act No. 32 of 2018)
                    </strong>{' '}
                    <span className="text-[#ba1a1a] font-bold">*</span>.
                  </label>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !isFormValid}
                    className={`w-full min-h-[48px] px-6 rounded-lg font-headline text-sm font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 ${
                      isFormValid && !isSubmitting
                        ? 'bg-[#a02010] hover:bg-[#861a0d] active:bg-[#6e1409] text-white cursor-pointer hover:shadow-lg'
                        : 'bg-[#e6e2dd] text-[#8d706b] cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined text-[20px] animate-spin">
                          progress_activity
                        </span>
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create account and send code</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-[#77574e] mt-2">
                    Next step: 6-digit OTP verification via mobile SMS or email.
                  </p>
                </div>

                {/* Already have an account link */}
                <div className="text-center pt-1 border-t border-[#f1ede8]">
                  <span className="text-xs text-[#5a413c]">Already registered with CEDA?</span>
                  <button
                    type="button"
                    onClick={() => setCurrentRoute('/login')}
                    className="text-xs font-bold text-[#a02010] hover:underline ml-1.5"
                  >
                    Log in here
                  </button>
                </div>
              </form>
            </div>

            {/* Assistance Strip */}
            <div className="mt-6 pt-4 border-t border-[#f1ede8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#77574e]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#a02010]">support_agent</span>
                <span>Need registration support?</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#1c1c19]">Toll Free: 1800 2332</span>
                <span>•</span>
                <button
                  onClick={() => setCurrentRoute('/help-center')}
                  className="hover:underline text-[#a02010]"
                >
                  Branch Directory
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
