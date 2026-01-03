import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, User, Lock, Mail, Phone, Calendar, Eye, EyeOff, LogOut, Trash2, Plus, Minus, Tag, CreditCard, Truck } from 'lucide-react';

// ============= TYPES & INTERFACES =============
interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  dob: string;
  gender: string;
  createdAt: Date;
  failedLogins: number;
  lockedUntil: Date | null;
}

interface Product {
  id: number;
  name: string;
  category: string;
  sku: string;
  price: number;
  image: string;
  stock: number;
  rating: number;
  size?: string[];
  color?: string[];
  brand?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface PromoCode {
  code: string;
  discount: number;
  active: boolean;
  freeShipping?: boolean;
}

interface Session {
  userId: number;
  expiresAt: Date | null;
}

interface RegisterErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  dob?: string;
  gender?: string;
}

interface DBType {
  users: User[];
  products: Product[];
  orders: any[];
  promoCodes: PromoCode[];
  sessions: { [token: string]: Session };
}

// ============= BACKEND SIMULATION (In-Memory Database) =============
const DB: DBType = {
  users: [],
  products: [
    { id: 1, name: 'Wireless Headphones', category: 'Electronics', sku: 'WH-001', price: 79.99, image: '🎧', stock: 15, rating: 4.5 },
    { id: 2, name: 'Cotton T-Shirt', category: 'Clothing', sku: 'CT-002', price: 24.99, image: '👕', stock: 50, rating: 4.0, size: ['S', 'M', 'L', 'XL'], color: ['Red', 'Blue', 'Black'] },
    { id: 3, name: 'Smart Watch', category: 'Electronics', sku: 'SW-003', price: 199.99, image: '⌚', stock: 8, rating: 4.8, brand: 'TechPro' },
    { id: 4, name: 'Running Shoes', category: 'Clothing', sku: 'RS-004', price: 89.99, image: '👟', stock: 20, rating: 4.6, size: ['7', '8', '9', '10', '11'] },
    { id: 5, name: 'Laptop Backpack', category: 'Accessories', sku: 'LB-005', price: 49.99, image: '🎒', stock: 30, rating: 4.3 },
    { id: 6, name: 'Bluetooth Speaker', category: 'Electronics', sku: 'BS-006', price: 59.99, image: '🔊', stock: 12, rating: 4.4, brand: 'SoundMax' },
    { id: 7, name: 'Yoga Mat', category: 'Sports', sku: 'YM-007', price: 34.99, image: '🧘', stock: 25, rating: 4.7 },
    { id: 8, name: 'Coffee Maker', category: 'Home', sku: 'CM-008', price: 129.99, image: '☕', stock: 5, rating: 4.2 },
  ],
  orders: [],
  promoCodes: [
    { code: 'SAVE10', discount: 0.10, active: true },
    { code: 'SAVE20', discount: 0.20, active: true },
    { code: 'FREESHIP', discount: 0, freeShipping: true, active: true }
  ],
  sessions: {}
};

// ============= CSV PERSISTENCE HELPERS =============
const CSV_STORAGE_KEY = 'shop_hub_users_csv';

const usersToCSV = (users: User[]): string => {
  const headers = ['id', 'fullName', 'email', 'phone', 'password', 'dob', 'gender', 'createdAt', 'failedLogins', 'lockedUntil'];
  const rows = users.map(u => [
    u.id,
    `"${u.fullName.replace(/"/g, '""')}"`,
    u.email,
    u.phone,
    u.password || '',
    u.dob,
    u.gender,
    u.createdAt.toISOString(),
    u.failedLogins,
    u.lockedUntil ? u.lockedUntil.toISOString() : ''
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
};

const csvToUsers = (csv: string): User[] => {
  const lines = csv.split('\n').filter(line => line.trim() !== '');
  if (lines.length <= 1) return [];

  return lines.slice(1).map(line => {
    // Simple CSV parser that handles quoted strings
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);

    return {
      id: parseInt(parts[0]),
      fullName: parts[1],
      email: parts[2],
      phone: parts[3],
      password: parts[4],
      dob: parts[5],
      gender: parts[6],
      createdAt: new Date(parts[7]),
      failedLogins: parseInt(parts[8]),
      lockedUntil: parts[9] ? new Date(parts[9]) : null
    };
  });
};

const saveUsersToCSV = (users: User[]) => {
  const csv = usersToCSV(users);
  localStorage.setItem(CSV_STORAGE_KEY, csv);
};

const loadUsersFromCSV = (): User[] => {
  const csv = localStorage.getItem(CSV_STORAGE_KEY);
  if (!csv) return [];
  return csvToUsers(csv);
};

// Initialize DB users from CSV
DB.users = loadUsersFromCSV();

// Access Token Generation
const generateAccessToken = (user: User) => {
  const payload = {
    id: user.id,
    email: user.email,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  return btoa(JSON.stringify(payload));
};

// Backend API Simulation
const API = {
  register: async (userData: any) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const users = loadUsersFromCSV();
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('An account with this email already exists. Please Log In.');
    }

    const newUser: User = {
      id: Date.now(),
      ...userData,
      createdAt: new Date(),
      failedLogins: 0,
      lockedUntil: null
    };

    users.push(newUser);
    saveUsersToCSV(users);
    DB.users = users; // Update in-memory DB as well

    return { success: true, user: newUser };
  },

  login: async (email: string, password: string, rememberMe: boolean) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const users = loadUsersFromCSV();
    const userIndex = users.findIndex(u => u.email === email);
    const user = users[userIndex];

    if (!user) {
      throw new Error('Invalid email or password. Please try again.');
    }

    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      throw new Error('Too many failed attempts. Please try again in 30 minutes or reset your password.');
    }

    if (user.password !== password) {
      user.failedLogins = (user.failedLogins || 0) + 1;

      if (user.failedLogins >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      saveUsersToCSV(users);
      DB.users = users;

      if (user.failedLogins >= 5) {
        throw new Error('Too many failed attempts. Please try again in 30 minutes or reset your password.');
      }

      throw new Error('Invalid email or password. Please try again.');
    }

    user.failedLogins = 0;
    user.lockedUntil = null;
    saveUsersToCSV(users);
    DB.users = users;

    const sessionToken = generateAccessToken(user);
    DB.sessions[sessionToken] = {
      userId: user.id,
      expiresAt: rememberMe ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
    };

    return { success: true, user, sessionToken };
  },

  searchProducts: async (query: string, filters: any = {}) => {
    await new Promise(resolve => setTimeout(resolve, 300));

    let results = DB.products;

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }

    if (filters.minPrice !== undefined) {
      results = results.filter(p => p.price >= filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      results = results.filter(p => p.price <= filters.maxPrice);
    }
    if (filters.category) {
      results = results.filter(p => p.category === filters.category);
    }

    return results;
  },

  validatePromoCode: async (code: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));

    const promo = DB.promoCodes.find(p => p.code === code && p.active);
    if (!promo) {
      throw new Error('Invalid promo code');
    }

    return promo;
  },

  placeOrder: async (orderData: any) => {
    await new Promise(resolve => setTimeout(resolve, 800));

    for (const item of orderData.items) {
      const product = DB.products.find(p => p.id === item.id);
      if (!product || product.stock < item.quantity) {
        throw new Error(item.name + ' is no longer available');
      }
    }

    if (orderData.paymentMethod === 'card') {
      const paymentSuccess = Math.random() > 0.1;
      if (!paymentSuccess) {
        throw new Error('Payment failed. Please try again.');
      }
    }

    for (const item of orderData.items) {
      const product = DB.products.find(p => p.id === item.id);
      if (product) {
        product.stock -= item.quantity;
      }
    }

    const order = {
      id: 'ORD-' + Date.now(),
      ...orderData,
      status: 'confirmed',
      createdAt: new Date()
    };

    DB.orders.push(order);
    return order;
  }
};

// ============= UTILITY FUNCTIONS =============
const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

const validatePassword = (password: string) => {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[!@#$%]/.test(password)) return 'Password must contain a special character (!@#$%)';
  return null;
};

const calculateAge = (dob: string) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// ============= MAIN APP COMPONENT =============
export default function ECommercePlatform() {
  const [currentPage, setCurrentPage] = useState('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!currentUser && currentPage === 'home') {
      setCurrentPage('login');
    }
  }, [currentUser, currentPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        setCurrentPage={setCurrentPage}
        cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <main className="container mx-auto px-4 py-8">
        {currentPage === 'home' && (
          <HomePage
            setCurrentPage={setCurrentPage}
            setSearchQuery={setSearchQuery}
            currentUser={currentUser}
          />
        )}
        {currentPage === 'register' && (
          <RegisterPage
            setCurrentPage={setCurrentPage}
            setCurrentUser={setCurrentUser}
          />
        )}
        {currentPage === 'login' && (
          <LoginPage
            setCurrentPage={setCurrentPage}
            setCurrentUser={setCurrentUser}
          />
        )}
        {currentPage === 'search' && (
          <SearchPage
            searchQuery={searchQuery}
            cart={cart}
            setCart={setCart}
          />
        )}
        {currentPage === 'checkout' && (
          <CheckoutPage
            cart={cart}
            setCart={setCart}
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
          />
        )}
        {currentPage === 'thankyou' && (
          <ThankYouPage setCurrentPage={setCurrentPage} />
        )}
        {currentPage === 'about' && (
          <AboutPage />
        )}
      </main>
    </div>
  );
}

// ============= HEADER COMPONENT =============
function Header({ currentUser, setCurrentUser, setCurrentPage, cartItemCount, searchQuery, setSearchQuery }: {
  currentUser: User | null,
  setCurrentUser: (user: User | null) => void,
  setCurrentPage: (page: string) => void,
  cartItemCount: number,
  searchQuery: string,
  setSearchQuery: (query: string) => void
}) {
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentPage('search');
    }
  };

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1
            className="text-2xl font-bold text-blue-600 cursor-pointer"
            onClick={() => setCurrentPage('home')}
          >
            ShopHub
          </h1>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Hello, {currentUser.fullName}</span>
                <button
                  onClick={() => {
                    setCurrentUser(null);
                    setCurrentPage('home');
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setCurrentPage('login')}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <User className="w-4 h-4" />
                  Login
                </button>
                <button
                  onClick={() => setCurrentPage('register')}
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Register
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentPage('about')}
              className="text-sm text-gray-600 hover:text-blue-600 font-semibold"
            >
              About Us
            </button>

            <button
              onClick={() => setCurrentPage('checkout')}
              className="relative"
            >
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.slice(0, 100))}
            placeholder="Search products, categories, or SKU..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            Search
          </button>
        </form>
      </div>
    </header>
  );
}

// ============= HOME PAGE =============
function HomePage({ setCurrentPage, setSearchQuery, currentUser }: {
  setCurrentPage: (page: string) => void,
  setSearchQuery: (query: string) => void,
  currentUser: User | null
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-12 rounded-lg mb-8 text-center">
        <h2 className="text-4xl font-bold mb-4">Welcome to ShopHub</h2>
        <p className="text-xl mb-6">Discover amazing products at unbeatable prices</p>
        {!currentUser && (
          <button
            onClick={() => setCurrentPage('register')}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100"
          >
            Get Started
          </button>
        )}
      </div>

      <h3 className="text-2xl font-bold mb-6">Top Selling Products</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {DB.products.slice(0, 4).map(product => (
          <div key={product.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
            <div className="text-6xl mb-4 text-center">{product.image}</div>
            <h4 className="font-semibold text-gray-800 mb-2">{product.name}</h4>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-yellow-500">★</span>
              <span className="text-sm text-gray-600">{product.rating}</span>
            </div>
            <div className="text-xl font-bold text-blue-600 mb-3">${product.price.toFixed(2)}</div>
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage('search');
              }}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              View All Products
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= REGISTER PAGE (US-101) =============
function RegisterPage({ setCurrentPage, setCurrentUser }: {
  setCurrentPage: (page: string) => void,
  setCurrentUser: (user: User | null) => void
}) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    dob: '',
    gender: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const validate = () => {
    const newErrors: RegisterErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Phone must be 10-15 digits';
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    } else if (calculateAge(formData.dob) < 18) {
      newErrors.dob = 'You must be 18 years or older';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const result = await API.register(formData);
      setCurrentUser(result.user);
      alert('Welcome! Please check your email to verify your account.');
      setCurrentPage('home');
    } catch (error: any) {
      setGeneralError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    alert('Google Sign-In would be integrated here using OAuth 2.0');
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center">Create Account</h2>

      {generalError && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-4">
          {generalError}
        </div>
      )}

      <button
        onClick={handleGoogleRegister}
        className="w-full mb-6 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 font-semibold"
      >
        <span className="text-xl">G</span> Sign up with Google
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="text-gray-500 text-sm">OR</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Full Name *</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className={'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ' + (errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500')}
          />
          {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Email Address *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={'w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ' + (errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500')}
            />
          </div>
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Phone Number *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={'w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ' + (errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500')}
              placeholder="10-15 digits"
            />
          </div>
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={'w-full pl-10 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 ' + (errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3"
            >
              {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          <p className="text-xs text-gray-500 mt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 special (!@#$%)</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Date of Birth *</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className={'w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ' + (errors.dob ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500')}
            />
          </div>
          {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-700">
              I agree to the <span className="text-blue-600 underline cursor-pointer">Terms and Conditions</span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={!agreeTerms || loading}
          className={'w-full py-3 rounded-lg font-semibold ' + (!agreeTerms || loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700')}
        >
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <p className="text-center mt-6 text-sm text-gray-600">
        Already have an account?{' '}
        <button
          onClick={() => setCurrentPage('login')}
          className="text-blue-600 hover:underline font-semibold"
        >
          Log In
        </button>
      </p>
    </div>
  );
}

// ============= LOGIN PAGE (US-102) =============
function LoginPage({ setCurrentPage, setCurrentUser }: {
  setCurrentPage: (page: string) => void,
  setCurrentUser: (user: User | null) => void
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await API.login(email, password, rememberMe);
      setCurrentUser(result.user);
      setCurrentPage('home');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert('Google Sign-In would be integrated here using OAuth 2.0');
  };

  const isFormValid = email.trim().length > 0 && password.length > 0;

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center">Welcome Back</h2>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        className="w-full mb-6 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 font-semibold"
      >
        <span className="text-xl">G</span> Login with Google
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="text-gray-500 text-sm">OR</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3"
            >
              {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => alert('Password reset functionality would be implemented here (US-103)')}
            className="text-sm text-blue-600 hover:underline mt-1"
          >
            Forgot Password?
          </button>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Remember me for 30 days</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || loading}
          className={'w-full py-3 rounded-lg font-semibold ' + (!isFormValid || loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700')}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="text-center mt-6 text-sm text-gray-600">
        Don't have an account?{' '}
        <button
          onClick={() => setCurrentPage('register')}
          className="text-blue-600 hover:underline font-semibold"
        >
          Register
        </button>
      </p>
    </div>
  );
}

// ============= SEARCH PAGE (US-103) =============
const INITIAL_FILTERS = {
  minPrice: '',
  maxPrice: '',
  category: '',
  sortBy: 'relevance'
};

function SearchPage({ searchQuery, cart, setCart }: { searchQuery: string, cart: CartItem[], setCart: React.Dispatch<React.SetStateAction<CartItem[]>> }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [pendingFilters, setPendingFilters] = useState({ ...filters });
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const itemsPerPage = 24;

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const results = await API.searchProducts(searchQuery, {
          minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
          category: filters.category || undefined
        });

        let sorted = [...results];
        if (filters.sortBy === 'price-low') {
          sorted.sort((a, b) => a.price - b.price);
        } else if (filters.sortBy === 'price-high') {
          sorted.sort((a, b) => b.price - a.price);
        } else if (filters.sortBy === 'newest') {
          sorted.sort((a, b) => b.id - a.id);
        }

        setProducts(sorted);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, filters]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    alert(product.name + ' added to cart!');
  };

  const categories = [...new Set(DB.products.map(p => p.category))];
  const startIndex = (currentPageNum - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = products.slice(startIndex, endIndex);
  const totalPages = Math.ceil(products.length / itemsPerPage);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold mb-4">We couldn't find any matches for "{searchQuery}"</h2>
        <p className="text-gray-600 mb-8">Check your spelling or try different keywords</p>

        <h3 className="text-xl font-bold mb-6">Top Selling Products</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {DB.products.slice(0, 4).map(product => (
            <div key={product.id} className="bg-white p-4 rounded-lg shadow">
              <div className="text-6xl mb-4 text-center">{product.image}</div>
              <h4 className="font-semibold text-gray-800 mb-2">{product.name}</h4>
              <div className="text-xl font-bold text-blue-600 mb-3">${product.price.toFixed(2)}</div>
              <button
                onClick={() => addToCart(product)}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <div className="w-64 bg-white p-6 rounded-lg shadow h-fit">
        <h3 className="text-lg font-bold mb-4">Filters</h3>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Price Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={pendingFilters.minPrice}
              onChange={(e) => setPendingFilters({ ...pendingFilters, minPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Max"
              value={pendingFilters.maxPrice}
              onChange={(e) => setPendingFilters({ ...pendingFilters, maxPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Category</label>
          <select
            value={pendingFilters.category}
            onChange={(e) => setPendingFilters({ ...pendingFilters, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="mb-6 flex flex-col gap-2">
          <button
            onClick={() => setFilters({ ...filters, ...pendingFilters })}
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilters({ ...INITIAL_FILTERS });
              setPendingFilters({ ...INITIAL_FILTERS });
              setCurrentPageNum(1);
            }}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded font-semibold hover:bg-gray-200 transition"
          >
            Reset Filters
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => {
              const newSort = e.target.value;
              setFilters({ ...filters, sortBy: newSort });
              setPendingFilters({ ...pendingFilters, sortBy: newSort });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="relevance">Relevance</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="newest">Newest Arrivals</option>
          </select>
        </div>
      </div>

      <div className="flex-1">
        <div className="mb-4">
          <p className="text-gray-600">{products.length} results found</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {paginatedProducts.map(product => (
            <div key={product.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
              <div className="text-6xl mb-4 text-center">{product.image}</div>
              <h4 className="font-semibold text-gray-800 mb-2 line-clamp-2">{product.name}</h4>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-yellow-500">★</span>
                <span className="text-sm text-gray-600">{product.rating}</span>
              </div>
              <div className="text-xl font-bold text-blue-600 mb-2">${product.price.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mb-3">Stock: {product.stock}</p>
              <button
                onClick={() => addToCart(product)}
                disabled={product.stock === 0}
                className={'w-full py-2 rounded font-semibold ' + (product.stock === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700')}
              >
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setCurrentPageNum(Math.max(1, currentPageNum - 1))}
              disabled={currentPageNum === 1}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50"
            >
              Prev
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPageNum(i + 1)}
                className={'px-4 py-2 rounded border ' + (currentPageNum === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300')}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPageNum(Math.min(totalPages, currentPageNum + 1))}
              disabled={currentPageNum === totalPages}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============= CHECKOUT PAGE (US-104) =============
function CheckoutPage({ cart, setCart, currentUser, setCurrentPage }: { cart: CartItem[], setCart: React.Dispatch<React.SetStateAction<CartItem[]>>, currentUser: any, setCurrentPage: (page: string) => void }) {
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardInfo, setCardInfo] = useState({ number: '', expiry: '', cvc: '', saveCard: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOrderLocked, setIsOrderLocked] = useState(false);

  const updateQuantity = (productId: number, delta: number) => {
    if (isOrderLocked) return;

    setCart(prevCart => prevCart.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        return newQty <= 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter((item): item is CartItem => item !== null));
  };

  const removeItem = (productId: number) => {
    if (isOrderLocked) return;
    setCart(cart.filter(item => item.id !== productId));
  };

  const applyPromoCode = async () => {
    try {
      const promo = await API.validatePromoCode(promoCode);
      setAppliedPromo(promo);
      setError('');
      alert('Promo code applied successfully!');
    } catch (err: any) {
      setError(err.message);
      setAppliedPromo(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (!currentUser) {
      alert('Please login to place an order');
      setCurrentPage('login');
      return;
    }

    setIsOrderLocked(true);
    setLoading(true);
    setError('');

    try {
      const orderData = {
        userId: currentUser.id,
        items: cart,
        subtotal,
        discount: discountAmount,
        shippingCost,
        total: grandTotal,
        paymentMethod,
        promoCode: appliedPromo ? appliedPromo.code : undefined,
        shippingMethod
      };

      await API.placeOrder(orderData);
      setCart([]);
      setCurrentPage('thankyou');
    } catch (err: any) {
      setError(err.message);
      setIsOrderLocked(false);

      if (err.message.includes('no longer available')) {
        const unavailableItem = cart.find(item => {
          const product = DB.products.find(p => p.id === item.id);
          return !product || product.stock < item.quantity;
        });

        if (unavailableItem) {
          setCart(cart.filter(item => item.id !== unavailableItem.id));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <ShoppingCart className="w-24 h-24 mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <button
          onClick={() => setCurrentPage('home')}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = appliedPromo ? Math.min(subtotal * (appliedPromo.discount || 0), subtotal) : 0;
  const subtotalAfterDiscount = subtotal - discountAmount;

  let shippingCost = 0;
  if (appliedPromo && appliedPromo.freeShipping) {
    shippingCost = 0;
  } else if (subtotalAfterDiscount >= 100) {
    shippingCost = 0;
  } else {
    shippingCost = shippingMethod === 'express' ? 15.00 : 5.00;
  }

  const grandTotal = subtotalAfterDiscount + shippingCost;

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">Checkout</h2>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-xl font-bold mb-4">Order Summary</h3>

            {cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 py-4 border-b">
                <div className="text-4xl">{item.image}</div>
                <div className="flex-1">
                  <h4 className="font-semibold">{item.name}</h4>
                  <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    disabled={isOrderLocked}
                    className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    disabled={isOrderLocked}
                    className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-24 text-right font-bold">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={isOrderLocked}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Truck className="w-6 h-6" />
              Shipping Method
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="standard"
                  checked={shippingMethod === 'standard'}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  disabled={isOrderLocked}
                />
                <div className="flex-1">
                  <div className="font-semibold">Standard Shipping</div>
                  <div className="text-sm text-gray-600">5-7 business days</div>
                </div>
                <div className="font-bold">
                  {subtotalAfterDiscount >= 100 || (appliedPromo && appliedPromo.freeShipping) ? 'FREE' : '$5.00'}
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="express"
                  checked={shippingMethod === 'express'}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  disabled={isOrderLocked}
                />
                <div className="flex-1">
                  <div className="font-semibold">Express Shipping</div>
                  <div className="text-sm text-gray-600">2-3 business days</div>
                </div>
                <div className="font-bold">
                  {appliedPromo && appliedPromo.freeShipping ? 'FREE' : '$15.00'}
                </div>
              </label>
            </div>

            {subtotalAfterDiscount >= 100 && !(appliedPromo && appliedPromo.freeShipping) && (
              <p className="text-sm text-green-600 mt-3">🎉 You qualify for free standard shipping!</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Payment Method
            </h3>

            <div className="space-y-4 mb-4">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isOrderLocked}
                />
                <span className="font-semibold">Credit/Debit Card</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isOrderLocked}
                />
                <span className="font-semibold">Cash on Delivery</span>
              </label>
            </div>

            {paymentMethod === 'card' && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800 mb-3">
                  <strong>Note:</strong> This is a demo. Card processing would be handled securely via Stripe/Payment Gateway iframe. We never store raw card data.
                </p>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Card Number (e.g., 4242 4242 4242 4242)"
                    value={cardInfo.number}
                    onChange={(e) => setCardInfo({ ...cardInfo, number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                    disabled={isOrderLocked}
                  />

                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardInfo.expiry}
                      onChange={(e) => setCardInfo({ ...cardInfo, expiry: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded"
                      disabled={isOrderLocked}
                    />
                    <input
                      type="text"
                      placeholder="CVC"
                      value={cardInfo.cvc}
                      onChange={(e) => setCardInfo({ ...cardInfo, cvc: e.target.value })}
                      className="w-24 px-4 py-2 border border-gray-300 rounded"
                      disabled={isOrderLocked}
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cardInfo.saveCard}
                      onChange={(e) => setCardInfo({ ...cardInfo, saveCard: e.target.checked })}
                      disabled={isOrderLocked}
                    />
                    <span className="text-sm">Save card for future purchases (tokenized)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white p-6 rounded-lg shadow sticky top-4">
            <h3 className="text-xl font-bold mb-4">Price Summary</h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>

              {appliedPromo && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({appliedPromo.code})</span>
                  <span className="font-semibold">-${discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">
                  {shippingCost === 0 ? 'FREE' : '$' + shippingCost.toFixed(2)}
                </span>
              </div>

              <div className="border-t pt-3 flex justify-between text-xl">
                <span className="font-bold">Total</span>
                <span className="font-bold text-blue-600">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {!appliedPromo && (
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                    disabled={isOrderLocked}
                  />
                  <button
                    onClick={applyPromoCode}
                    disabled={!promoCode || isOrderLocked}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Try: SAVE10, SAVE20, or FREESHIP</p>
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={loading || isOrderLocked}
              className={'w-full py-3 rounded-lg font-bold text-lg ' + (loading || isOrderLocked ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700')}
            >
              {loading ? 'Processing...' : 'Place Order'}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              🔒 Secure checkout • PCI DSS compliant
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= THANK YOU PAGE =============
function ThankYouPage({ setCurrentPage }: { setCurrentPage: (page: string) => void }) {
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold mb-4">Order Placed Successfully!</h2>
      <p className="text-gray-600 mb-2">Thank you for your purchase.</p>
      <p className="text-gray-600 mb-8">You will receive an email confirmation shortly.</p>

      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <p className="text-sm text-gray-600 mb-2">Order ID</p>
        <p className="text-2xl font-bold text-blue-600">ORD-{Date.now()}</p>
      </div>

      <button
        onClick={() => setCurrentPage('home')}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold"
      >
        Continue Shopping
      </button>
    </div>
  );
}

// ============= ABOUT US PAGE =============
function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-center">About ShopHub</h2>
      <div className="space-y-6 text-gray-700">
        <p>
          Welcome to ShopHub, your number one source for all things electronics, clothing, and accessories.
          We're dedicated to giving you the very best of products, with a focus on dependability,
          customer service, and uniqueness.
        </p>
        <p>
          Founded in 2026, ShopHub has come a long way from its beginnings. When we first started out,
          our passion for "eco-friendly products" drove us to do tons of research so that ShopHub can
          offer you the world's most advanced shopping experience. We now serve customers all over
          the world and are thrilled that we're able to turn our passion into our own website.
        </p>
        <p>
          We hope you enjoy our products as much as we enjoy offering them to you. If you have any
          questions or comments, please don't hesitate to contact us.
        </p>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-xl font-bold mb-4">Quick Links</h3>
          <ul className="space-y-2">
            <li>
              <a href="https://www.googl.com/" className="text-blue-600 hover:underline">Our Secret Mission</a>
            </li>
            <li>
              <a href="https://www.google.com/" className="text-blue-600 hover:underline">Meet the CEO</a>
            </li>
            <li>
              <a href="/404-test" className="text-blue-600 hover:underline">Investor Relations</a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}