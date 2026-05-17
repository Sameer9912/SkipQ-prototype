import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from './firebaseConfig';

export default function StudentAppScreen({ onLogout }) {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  
  const [stalls, setStalls] = useState([]);
  const [selectedStall, setSelectedStall] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [myOrders, setMyOrders] = useState([]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (auth.currentUser) {
      getDoc(doc(db, 'users', auth.currentUser.uid)).then(d => {
        if (d.exists()) {
          setUser({uid: auth.currentUser.uid, ...d.data()});
          setUserName(d.data().name || "");
        }
      });
    }
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'stalls'), s => setStalls(s.docs.map(d => ({id: d.id, ...d.data()}))));
  }, []);

  useEffect(() => {
    if (!selectedStall) return;
    return onSnapshot(query(collection(db, 'menuItems'), where('stallId', '==', selectedStall.id)), 
      s => setMenuItems(s.docs.map(d => ({id: d.id, ...d.data()})))
    );
  }, [selectedStall]);

  useEffect(() => {
    if (!user || !user.name) return;
    const q = query(collection(db, 'orders'), where('customerName', '==', user.name));
    return onSnapshot(q, s => {
      const fetchedOrders = s.docs.map(d => ({id: d.id, ...d.data()}));
      fetchedOrders.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setMyOrders(fetchedOrders);
    });
  }, [user]);

  const handleAuth = async () => {
    try {
      const cred = isLogin ? await signInWithEmailAndPassword(auth, email, password) : await createUserWithEmailAndPassword(auth, email, password);
      if (!isLogin) {
        await setDoc(doc(db, 'users', cred.user.uid), { name: userName, role: 'Student' });
        setUser({uid: cred.user.uid, name: userName});
      } else {
        const d = await getDoc(doc(db, 'users', cred.user.uid));
        setUser({uid: cred.user.uid, ...d.data()});
        setUserName(d.data()?.name || "");
      }
    } catch (e) { Alert.alert("Error", e.message); }
  };

  // NEW: True Logout Function
  const handleLogout = async () => {
    await signOut(auth); // Tells Firebase to log you out
    setUser(null);
    onLogout(); // Returns to main role selection
  };

  const saveName = async () => {
    try {
      if (!userName.trim()) return Alert.alert("Error", "Name cannot be empty");
      await setDoc(doc(db, 'users', user.uid), { name: userName, role: 'Student' }, { merge: true });
      setUser({ ...user, name: userName });
      setIsEditingName(false);
      Alert.alert("Success", "Name updated!");
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const checkout = async () => {
    if (!user.name) return Alert.alert("Wait!", "Please set your name in profile first.");
    const groups = cart.reduce((acc, item) => {
      acc[item.stallId] = acc[item.stallId] || [];
      acc[item.stallId].push(item);
      return acc;
    }, {});
    try {
      for (const sid in groups) {
        await addDoc(collection(db, 'orders'), {
          stallId: sid,
          stallName: groups[sid][0].stallName,
          customerName: user.name,
          studentUid: user.uid,
          items: groups[sid],
          status: 'Pending',
          timestamp: new Date()
        });
      }
      setCart([]);
      setSelectedStall(null);
      setActiveTab('orders');
    } catch (e) { Alert.alert("Error", e.message); }
  };

  if (!user) return (
    <View style={sStyles.container}>
      <TouchableOpacity onPress={onLogout} style={{marginBottom: 20}}><Text style={{color: '#ff4757', fontWeight: 'bold'}}>← Back to Roles</Text></TouchableOpacity>
      <Text style={sStyles.title}>Student {isLogin ? 'Login' : 'Signup'}</Text>
      {!isLogin && <TextInput style={sStyles.input} placeholder="Full Name" value={userName} onChangeText={setUserName} />}
      <TextInput style={sStyles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={sStyles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={sStyles.mainBtn} onPress={handleAuth}><Text style={sStyles.mainBtnT}>Enter SkipQ</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}><Text style={sStyles.switch}>Switch to {isLogin ? 'Signup' : 'Login'}</Text></TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={sStyles.container}>
      <View style={sStyles.topRow}>
        {/* Changed Exit button to properly log you out */}
        <TouchableOpacity onPress={() => selectedStall ? setSelectedStall(null) : handleLogout()}>
          <Text style={sStyles.backText}>← {selectedStall ? 'Back to Stalls' : 'Logout'}</Text>
        </TouchableOpacity>
        <View style={{alignItems: 'flex-end'}}>
          {isEditingName ? (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TextInput style={sStyles.miniInput} value={userName} onChangeText={setUserName} autoFocus />
              <TouchableOpacity onPress={saveName}><Text style={{color: '#2ed573', fontWeight: 'bold'}}>Save</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsEditingName(true)}>
              <Text style={sStyles.userGreet}>Hey, {user.name || 'Set Name'} ✏️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{flex: 1}}>
        {activeTab === 'orders' && (
          <FlatList 
            data={myOrders} 
            ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 50, color: '#a4b0be'}}>No recent orders.</Text>}
            renderItem={({item}) => (
              <View style={sStyles.trackCard}>
                <View style={sStyles.trackHeader}>
                  <Text style={sStyles.stallTitle}>{item.stallName || 'Canteen Stall'}</Text>
                  <Text style={sStyles.timeText}>{formatTime(item.timestamp)}</Text>
                </View>
                
                <View style={{marginVertical: 10}}>
                  {/* Fixed math for student tracking display */}
                  {item.items.map((i, idx) => (
                    <Text key={idx} style={sStyles.trackItem}>• {i.quantity || 1}x {i.itemName}</Text>
                  ))}
                </View>

                <View style={sStyles.trackFooter}>
                  <Text style={sStyles.totalText}>Total: ₹{item.items.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0)}</Text>
                  <View style={[sStyles.statusBadge, {
                    backgroundColor: item.status === 'Ready' ? '#2ed573' : item.status === 'Preparing' ? '#ffa502' : item.status === 'Unavailable' ? '#ff4757' : '#747d8c'
                  }]}>
                    <Text style={sStyles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
          )} />
        )}

        {activeTab === 'home' && selectedStall && (
          <View style={{flex: 1}}>
            <Text style={sStyles.title}>{selectedStall.stallName}</Text>
            <FlatList data={menuItems} renderItem={({item}) => (
              <View style={sStyles.listItem}>
                <View><Text style={sStyles.itemName}>{item.itemName}</Text><Text style={sStyles.itemPrice}>₹{item.price}</Text></View>
                {/* NEW: Adds quantity: 1 when saving item to cart */}
                <TouchableOpacity onPress={() => setCart([...cart, {...item, quantity: 1, stallId: selectedStall.id, stallName: selectedStall.stallName}])} style={sStyles.addBtn}>
                  <Text style={sStyles.addBtnT}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            )} />
          </View>
        )}

        {activeTab === 'home' && !selectedStall && (
          <FlatList data={stalls} ListHeaderComponent={<Text style={sStyles.sub}>Browse Canteen</Text>} renderItem={({item}) => (
            <TouchableOpacity style={sStyles.stallCard} onPress={() => setSelectedStall(item)}>
              <Text style={sStyles.stallEmoji}>🍔</Text>
              <View><Text style={sStyles.stallTitle}>{item.stallName}</Text><Text style={sStyles.stallSub}>Tap to order</Text></View>
            </TouchableOpacity>
          )} />
        )}
      </View>

      {/* Floating cart math fixed too */}
      {cart.length > 0 && activeTab === 'home' && (
        <TouchableOpacity style={sStyles.floatingCart} onPress={checkout}>
          <Text style={sStyles.cartText}>Checkout ({cart.length}) • ₹{cart.reduce((a, b) => a + (b.price * (b.quantity || 1)), 0)}</Text>
        </TouchableOpacity>
      )}

      <View style={sStyles.bottomNav}>
        <TouchableOpacity style={sStyles.navItem} onPress={() => { setActiveTab('home'); setSelectedStall(null); }}>
          <Text style={[sStyles.navText, activeTab === 'home' && sStyles.navActive]}>🏠 Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={sStyles.navItem} onPress={() => setActiveTab('orders')}>
          <Text style={[sStyles.navText, activeTab === 'orders' && sStyles.navActive]}>🧾 My Orders</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const sStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 20 },
  backText: { color: '#ff4757', fontWeight: 'bold' },
  userGreet: { fontSize: 16, fontWeight: 'bold', color: '#2f3542' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 15, paddingHorizontal: 20 },
  sub: { fontSize: 16, color: '#747d8c', marginBottom: 15, paddingHorizontal: 20, fontWeight: '600' },
  input: { backgroundColor: '#f1f2f6', padding: 18, borderRadius: 15, marginBottom: 12, marginHorizontal: 20 },
  miniInput: { borderBottomWidth: 1, borderColor: '#ccc', width: 100, marginRight: 10, paddingVertical: 2 },
  mainBtn: { backgroundColor: '#ff4757', padding: 18, borderRadius: 15, alignItems: 'center', marginHorizontal: 20, marginTop: 10 },
  mainBtnT: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  stallCard: { backgroundColor: '#f8f9fa', padding: 20, borderRadius: 20, marginHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  stallEmoji: { fontSize: 30, marginRight: 15 },
  stallTitle: { fontSize: 18, fontWeight: 'bold', color: '#2f3542' },
  stallSub: { color: '#a4b0be', fontSize: 12 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#f1f2f6' },
  itemName: { fontSize: 17, fontWeight: '600' },
  itemPrice: { color: '#ff4757', fontWeight: 'bold', marginTop: 4 },
  addBtn: { backgroundColor: '#ff4757', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  addBtnT: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  trackCard: { backgroundColor: '#fff', padding: 20, marginHorizontal: 20, marginBottom: 15, borderRadius: 20, borderWidth: 1, borderColor: '#f1f2f6', elevation: 2 },
  trackHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#f1f2f6', paddingBottom: 10 },
  timeText: { color: '#a4b0be', fontSize: 12 },
  trackItem: { color: '#57606f', fontSize: 15, marginBottom: 4 },
  trackFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderColor: '#f1f2f6' },
  totalText: { fontWeight: 'bold', fontSize: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 10, letterSpacing: 1 },
  floatingCart: { position: 'absolute', bottom: 80, left: 20, right: 20, backgroundColor: '#2f3542', padding: 18, borderRadius: 20, alignItems: 'center', elevation: 5 },
  cartText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff', paddingVertical: 15 },
  navItem: { flex: 1, alignItems: 'center' },
  navText: { fontSize: 15, color: '#a4b0be', fontWeight: '600' },
  navActive: { color: '#ff4757', fontWeight: 'bold' },
  switch: { textAlign: 'center', marginTop: 20, color: '#ff4757', fontWeight: '600' }
});