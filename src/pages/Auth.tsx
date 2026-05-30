import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Loader2, Mail, Lock, User, Shield, Users, Building, KeyRound, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, profile, profileLoading, signIn, signUp, completeOnboarding, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signupRole, setSignupRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [institutionName, setInstitutionName] = useState('');
  const [institutionJoinCode, setInstitutionJoinCode] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Onboarding form state (for Google login flow)
  const [onboardingRole, setOnboardingRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [onboardingDisplayName, setOnboardingDisplayName] = useState('');
  const [onboardingInstitutionName, setOnboardingInstitutionName] = useState('');
  const [onboardingInstitutionJoinCode, setOnboardingInstitutionJoinCode] = useState('');
  const [onboardingRollNumber, setOnboardingRollNumber] = useState('');

  // Redirect if logged in and profile is complete
  useEffect(() => {
    if (user && !loading && !profileLoading) {
      if (profile) {
        if (profile.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    }
  }, [user, loading, profile, profileLoading, navigate]);

  // Set default display name from Google user on onboarding load
  useEffect(() => {
    if (user && !profile && !profileLoading && user.displayName) {
      setOnboardingDisplayName(user.displayName);
    }
  }, [user, profile, profileLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }
    
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    
    if (error) {
      let message = error.message;
      if (message.includes('auth/invalid-credential') || message.includes('auth/user-not-found') || message.includes('auth/wrong-password')) {
        message = 'Invalid email or password. Please try again.';
      }
      toast({
        title: 'Login Failed',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }
    
    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }

    if (!displayName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name.',
        variant: 'destructive',
      });
      return;
    }

    if (signupRole === 'admin' && !institutionName.trim()) {
      toast({
        title: 'Institution Name Required',
        description: 'Please enter the name of the school or college.',
        variant: 'destructive',
      });
      return;
    }

    if (signupRole !== 'admin' && !institutionJoinCode.trim()) {
      toast({
        title: 'Institution Join Code Required',
        description: 'Please enter your 6-digit institution join code.',
        variant: 'destructive',
      });
      return;
    }

    if (signupRole === 'student' && !rollNumber.trim()) {
      toast({
        title: 'Roll Number Required',
        description: 'Please enter your academic Roll/ID number.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await signUp(
      signupEmail, 
      signupPassword, 
      signupRole, 
      displayName, 
      institutionName, 
      signupRole !== 'admin' ? institutionJoinCode : undefined, 
      signupRole === 'student' ? rollNumber : undefined
    );
    setIsSubmitting(false);
    
    if (error) {
      toast({
        title: 'Signup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account created!',
        description: 'Your profile has been created successfully.',
      });
    }
  };

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!onboardingDisplayName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name.',
        variant: 'destructive',
      });
      return;
    }

    if (onboardingRole === 'admin' && !onboardingInstitutionName.trim()) {
      toast({
        title: 'Institution Name Required',
        description: 'Please enter the institution name.',
        variant: 'destructive',
      });
      return;
    }

    if (onboardingRole !== 'admin' && !onboardingInstitutionJoinCode.trim()) {
      toast({
        title: 'Institution Code Required',
        description: 'Please enter your 6-digit institution join code.',
        variant: 'destructive',
      });
      return;
    }

    if (onboardingRole === 'student' && !onboardingRollNumber.trim()) {
      toast({
        title: 'Roll Number Required',
        description: 'Please enter your roll number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await completeOnboarding(
      onboardingRole, 
      onboardingDisplayName, 
      onboardingInstitutionName, 
      onboardingRole !== 'admin' ? onboardingInstitutionJoinCode : undefined, 
      onboardingRole === 'student' ? onboardingRollNumber : undefined
    );
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Onboarding Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Onboarding Completed!',
        description: 'Your profile is ready.',
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    setIsSubmitting(false);
    
    if (error) {
      toast({
        title: 'Sign-In Issue',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render Onboarding UI if user is authenticated but has no Firestore profile (e.g. Google Sign-In first time)
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-lg shadow-xl border border-slate-200 bg-white">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-3 rounded-2xl bg-primary/10 w-fit mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-900">Complete Your Profile</CardTitle>
            <CardDescription className="text-sm font-semibold text-slate-500 mt-1">
              Select your academic role and set up your institution details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOnboarding} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">I am registering as a:</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={onboardingRole === 'student' ? 'default' : 'outline'}
                    onClick={() => setOnboardingRole('student')}
                    className="rounded-xl font-bold flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Student
                  </Button>
                  <Button
                    type="button"
                    variant={onboardingRole === 'teacher' ? 'default' : 'outline'}
                    onClick={() => setOnboardingRole('teacher')}
                    className="rounded-xl font-bold flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Teacher
                  </Button>
                  <Button
                    type="button"
                    variant={onboardingRole === 'admin' ? 'default' : 'outline'}
                    onClick={() => setOnboardingRole('admin')}
                    className="rounded-xl font-bold flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ob-display-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="ob-display-name"
                    type="text"
                    placeholder="Enter your name"
                    value={onboardingDisplayName}
                    onChange={(e) => setOnboardingDisplayName(e.target.value)}
                    className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                    required
                  />
                </div>
              </div>

              {onboardingRole === 'admin' ? (
                <div className="space-y-2">
                  <Label htmlFor="ob-inst-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Institution / College Name</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="ob-inst-name"
                      type="text"
                      placeholder="e.g. Stanford University"
                      value={onboardingInstitutionName}
                      onChange={(e) => setOnboardingInstitutionName(e.target.value)}
                      className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="ob-inst-code" className="text-xs font-bold uppercase tracking-wider text-slate-500">Institution Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="ob-inst-code"
                      type="text"
                      placeholder="Enter 6-digit join code"
                      value={onboardingInstitutionJoinCode}
                      onChange={(e) => setOnboardingInstitutionJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="pl-10 h-11 rounded-xl border border-slate-200 font-black tracking-widest text-center uppercase"
                      required
                    />
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400">Ask your institution administrator for their invite code.</p>
                </div>
              )}

              {onboardingRole === 'student' && (
                <div className="space-y-2">
                  <Label htmlFor="ob-roll" className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Roll / ID Number</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="ob-roll"
                      type="text"
                      placeholder="e.g. 2026CS102"
                      value={onboardingRollNumber}
                      onChange={(e) => setOnboardingRollNumber(e.target.value)}
                      className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                      required
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-11 rounded-xl font-bold mt-4 shadow-lg shadow-primary/20" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving profile...
                  </>
                ) : (
                  'Complete Profile Setup'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 lg:p-0">
      <div className="w-full max-w-6xl grid lg:grid-cols-12 overflow-hidden lg:rounded-[2rem] lg:shadow-2xl lg:border lg:border-slate-200 bg-white">
        
        {/* Left Panel: App Branding & Information */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-tr from-cyan-600 to-teal-500 p-12 text-white flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight">PresentIQ</span>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Attendance Hub</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-black leading-tight">Institutional Attendance Redefined.</h2>
            <p className="text-sm font-semibold opacity-90 leading-relaxed">
              Experience the next-generation role-based dashboard for administrators, educators, and students.
            </p>
            <ul className="space-y-3.5 text-xs font-bold text-white/95">
              <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">1</span>
                <span>Institution-wide stats & control</span>
              </li>
              <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">2</span>
                <span>Bulk student CSV importing</span>
              </li>
              <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">3</span>
                <span>Active class session tracking</span>
              </li>
            </ul>
          </div>

          <p className="text-[10px] font-black tracking-widest uppercase opacity-40">PresentIQ © 2026</p>
        </div>

        {/* Right Panel: Auth Cards */}
        <div className="lg:col-span-7 p-6 lg:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            <div className="lg:hidden text-center mb-8">
              <div className="mx-auto p-3 rounded-2xl bg-primary/10 w-fit mb-4">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">PresentIQ</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance Management System</p>
            </div>

            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="p-0 mb-6 text-center lg:text-left">
                <CardTitle className="text-2xl lg:text-3xl font-black text-slate-900">
                  {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
                </CardTitle>
                <CardDescription className="text-sm font-semibold text-slate-400 mt-1">
                  {activeTab === 'login' 
                    ? 'Sign in to access your attendance tools.' 
                    : 'Get started with role-based attendance management.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
                  <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-slate-100 rounded-xl mb-6">
                    <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:bg-white">Login</TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-lg font-bold data-[state=active]:bg-white">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Register as a:</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={signupRole === 'student' ? 'default' : 'outline'}
                            onClick={() => setSignupRole('student')}
                            className="rounded-xl font-bold"
                          >
                            Student
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={signupRole === 'teacher' ? 'default' : 'outline'}
                            onClick={() => setSignupRole('teacher')}
                            className="rounded-xl font-bold"
                          >
                            Teacher
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={signupRole === 'admin' ? 'default' : 'outline'}
                            onClick={() => setSignupRole('admin')}
                            className="rounded-xl font-bold"
                          >
                            Admin
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="display-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="display-name"
                            type="text"
                            placeholder="Enter your name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                      </div>

                      {signupRole === 'admin' ? (
                        <div className="space-y-2 animate-accordion-down">
                          <Label htmlFor="inst-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Institution / College Name</Label>
                          <div className="relative">
                            <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                              id="inst-name"
                              type="text"
                              placeholder="e.g. Stanford University"
                              value={institutionName}
                              onChange={(e) => setInstitutionName(e.target.value)}
                              className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 animate-accordion-down">
                          <Label htmlFor="inst-code" className="text-xs font-bold uppercase tracking-wider text-slate-500">Institution Join Code</Label>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                              id="inst-code"
                              type="text"
                              placeholder="Enter 6-digit join code"
                              value={institutionJoinCode}
                              onChange={(e) => setInstitutionJoinCode(e.target.value.toUpperCase())}
                              maxLength={6}
                              className="pl-10 h-11 rounded-xl border border-slate-200 font-black text-center uppercase tracking-widest"
                              required
                            />
                          </div>
                          <p className="text-[10px] font-semibold text-slate-400">Obtain the 6-character code from your administrator.</p>
                        </div>
                      )}

                      {signupRole === 'student' && (
                        <div className="space-y-2 animate-accordion-down">
                          <Label htmlFor="roll" className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Roll / ID Number</Label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                              id="roll"
                              type="text"
                              placeholder="e.g. 2026CS102"
                              value={rollNumber}
                              onChange={(e) => setRollNumber(e.target.value)}
                              className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="••••••••"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="confirm-password"
                            type="password"
                            placeholder="••••••••"
                            value={signupConfirmPassword}
                            onChange={(e) => setSignupConfirmPassword(e.target.value)}
                            className="pl-10 h-11 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          'Create Account'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
                <div className="relative mt-6 mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-400 font-semibold">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full h-11 rounded-xl font-bold text-slate-600 border-slate-200 hover:bg-slate-50 transition-colors" 
                  disabled={isSubmitting}
                  onClick={handleGoogleSignIn}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4.5 w-4.5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Google
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;
