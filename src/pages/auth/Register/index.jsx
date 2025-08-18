import React, { useState } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { EmailVerification } from '../Email-verification';
import { signUp, resendSignUpCode } from '@aws-amplify/auth';
import { useData } from '../../../app/contexts/DataProvider';
import {
  REGISTERED_USER_TEAM_NOTIFICATION_API_URL,
  updateUserProfilePending,
} from '../../../utils/api';
import { Eye, EyeOff } from 'lucide-react';
import styles from '../auth.module.css';

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const sendNotification = async (profileData) => {
  const apiEndpoint = REGISTERED_USER_TEAM_NOTIFICATION_API_URL;
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData),
  };
  const response = await fetch(apiEndpoint, requestOptions);
  if (!response.ok) {
    throw new Error('Failed to send notification');
  }
  return response.json();
};

export function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [company, setCompany] = useState('');
  const [occupation, setOccupation] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState(null);
  const [signUpError, setSignUpError] = useState('');
  const { opacity } = useData();
  const [errors, setErrors] = useState({});
  const opacityClass = opacity === 1 ? 'opacity-high' : 'opacity-low';

  const validate = () => {
    const formErrors = {};
    if (!firstName) formErrors.firstName = 'First name is required';
    if (!lastName) formErrors.lastName = 'Last name is required';
    if (!email) formErrors.email = 'Email is required';
    if (!phoneNumber) formErrors.phoneNumber = 'Phone number is required';
    if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) formErrors.phoneNumber = 'Invalid phone number';
    if (!password) {
      formErrors.password = 'Password is required';
    } else if (!passwordRegex.test(password)) {
      formErrors.password = 'Must be 8+ chars with number & special';
    }
    if (!repeatPassword) {
      formErrors.repeatPassword = 'Please repeat the password';
    } else if (password !== repeatPassword) {
      formErrors.repeatPassword = 'Passwords do not match';
    }
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const signUpResponse = await signUp({
        username: email,
        password,
        options: { userAttributes: { email } },
      });
      setIsRegistered(true);
      const cognitoSub =
        signUpResponse?.userId ??
        signUpResponse?.userSub ??
        signUpResponse?.user?.userId ??
        signUpResponse?.user?.sub;
      const profileData = {
        cognitoSub,
        email,
        firstName,
        lastName,
        phoneNumber,
        company,
        occupation,
        pending: true,
      };
      setRegistrationDetails({ ...profileData, password });
      try {
        await updateUserProfilePending(profileData);
      } catch (profileError) {
        console.error('Error saving profile:', profileError);
      }
      try {
        await sendNotification(profileData);
      } catch (profileError) {
        console.error('Error sending notification:', profileError);
      }
    } catch (error) {
      if (error?.name === 'UsernameExistsException') {
        try {
          await resendSignUpCode({ username: email });
        } catch (resendError) {
          console.error('Error resending code:', resendError);
        }
        setRegistrationDetails(null);
        setSignUpError('');
        setIsRegistered(true);
      } else {
        const message = error?.message || error?.name || 'Registration failed';
        setSignUpError(message);
      }
    }
  };

  if (isRegistered) {
    return <EmailVerification registrationData={registrationDetails} userEmail={email} />;
  }

  const isFormValid =
    firstName &&
    lastName &&
    email &&
    phoneNumber &&
    password &&
    repeatPassword &&
    password === repeatPassword;

  return (
    <HelmetProvider>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Register | *MYLG!*</title>
        <meta
          name="description"
          content="Create your account on *MYLG!* and transform your ideas into polished presentations."
        />
      </Helmet>
      <div className={`${opacityClass} ${styles.authPage}`}>
        <div className={styles.authCard}>
          <div className={styles.wordmark}>*MYLG!*</div>
          <h1 className={styles.authTitle}>Create your account</h1>
          <p className={styles.authSubtitle}>Please enter your registration details</p>
          <form
            className={styles.authForm}
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className={styles.field}>
              <label htmlFor="firstName" className={styles.label}>
                First Name
              </label>
              <input
                id="firstName"
                aria-label="First Name"
                className={`${styles.input} ${errors.firstName ? styles.invalid : ''}`}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              {errors.firstName && <p className={styles.helper}>{errors.firstName}</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor="lastName" className={styles.label}>
                Last Name
              </label>
              <input
                id="lastName"
                aria-label="Last Name"
                className={`${styles.input} ${errors.lastName ? styles.invalid : ''}`}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              {errors.lastName && <p className={styles.helper}>{errors.lastName}</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                id="email"
                aria-label="Email"
                type="email"
                autoComplete="email"
                className={`${styles.input} ${errors.email ? styles.invalid : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errors.email && <p className={styles.helper}>{errors.email}</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor="phone" className={styles.label}>
                Phone Number
              </label>
              <input
                id="phone"
                aria-label="Phone Number"
                className={`${styles.input} ${errors.phoneNumber ? styles.invalid : ''}`}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
              {errors.phoneNumber && <p className={styles.helper}>{errors.phoneNumber}</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor="company" className={styles.label}>
                Company
              </label>
              <input
                id="company"
                aria-label="Company"
                className={styles.input}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="occupation" className={styles.label}>
                Occupation
              </label>
              <input
                id="occupation"
                aria-label="Occupation"
                className={styles.input}
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  aria-label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`${styles.input} ${errors.password ? styles.invalid : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.toggle}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className={styles.helper}>{errors.password}</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor="repeatPassword" className={styles.label}>
                Repeat Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="repeatPassword"
                  aria-label="Repeat Password"
                  type={showRepeatPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`${styles.input} ${errors.repeatPassword ? styles.invalid : ''}`}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.toggle}
                  aria-label={showRepeatPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowRepeatPassword((v) => !v)}
                >
                  {showRepeatPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.repeatPassword && <p className={styles.helper}>{errors.repeatPassword}</p>}
            </div>
            {signUpError && <p className={styles.helper}>{signUpError}</p>}
            <button
              type="submit"
              className={`${styles.button} ${styles.primary}`}
              disabled={!isFormValid}
            >
              Register Account
            </button>
          </form>
          <div className={styles.actions}>
            <Link
              to="/login"
              state={{ email }}
              className={`${styles.button} ${styles.secondary}`}
            >
              Already have an account? Login!
            </Link>
          </div>
        </div>
      </div>
    </HelmetProvider>
  );
}

export default Register;
