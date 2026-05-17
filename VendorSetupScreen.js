import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from './firebaseConfig';

export default function VendorSetupScreen({ onLogout }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stallName, setStallName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [userUid, setUserUid] = useState(auth.currentUser?.uid || null);
  const [stallId, setStallId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (userUid) {
      setLoading(true);
      const q = query(collection(db, 'stalls'), where('vendorId', '==', userUid));
      getDocs(q).then(snap => {
        if (!snap.empty) setStallId(snap.docs[0].id);
        setLoading(false);
      });
    }
  }, [userUid]);

  useEffect(() => {
    if (!stallId) return;
    const unsubMenu = onSnapshot(query(collection(db, 'menuItems'), where('stallId', '==', stallId)), (s) => setMenuItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), where('stallId', '==', stallId)), (s) => setOrders(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubStall = onSnapshot(doc(db, 'stalls', stallId), (d) => { if(d.exists()) setStallName(d.data().stallName); });
    return () => { unsubMenu(); unsubOrders(); unsubStall(); };
  }, [stallId]);

  const handleAuth = async () => {
    try {
      const cred = isLogin ? await signInWithEmailAndPassword(auth, email, password) : await createUserWithEmailAndPassword(auth, email, password);
      setUserUid(cred.user.uid);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  // NEW: True Logout Function
  const handleLogout = async () => {
    await signOut(auth); // Tells Firebase to kill the session
    setUserUid(null);
    setStallId(null);
    onLogout(); // Returns to main role selection
  };

  if (loading) return (
    <View style={vStyles.center}><ActivityIndicator size="large" color="#ff4757" /><Text style={{marginTop: 10}}>Checking your stall...</Text></View>
  );

  if (stallId) return (
    <SafeAreaView style={vStyles.container}>
      <View style={vStyles.tabBar}>
        {['orders', 'menu', 'history', 'settings'].map(t => (
          <TouchableOpacity key={t} style={[vStyles.tab, activeTab === t && vStyles.activeTab]} onPress={() => setActiveTab(t)}>
            <Text style={activeTab === t ? vStyles.activeTabText : vStyles.tabText}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'orders' && (
        <FlatList data={orders.filter(o => o.status !== 'Ready' && o.status !== 'Unavailable')} renderItem={({item}) => (
          <View style={vStyles.orderCard}>
            <View style={vStyles.orderHeader}><Text style={vStyles.custName}>{item.customerName || "Anonymous"}</Text><Text style={vStyles.timeText}>{formatTime(item.timestamp)}</Text></View>
            {/* Added fallback for missing quantity */}
            {item.items.map((i, idx) => <Text key={idx} style={vStyles.foodItem}>• {i.quantity || 1}x {i.itemName}</Text>)}
            <View style={vStyles.btnRow}>
              <TouchableOpacity onPress={() => updateDoc(doc(db, 'orders', item.id), { status: 'Preparing' })} style={vStyles.sBtn}><Text style={vStyles.sBtnT}>Prepare</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => updateDoc(doc(db, 'orders', item.id), { status: 'Ready' })} style={[vStyles.sBtn, {backgroundColor: '#2ed573'}]}><Text style={vStyles.sBtnT}>Ready</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => updateDoc(doc(db, 'orders', item.id), { status: 'Unavailable' })} style={[vStyles.sBtn, {backgroundColor: '#ff4757'}]}><Text style={vStyles.sBtnT}>N/A</Text></TouchableOpacity>
            </View>
          </View>
        )} />
      )}

      {activeTab === 'menu' && (
        <View style={{flex: 1}}>
          <View style={vStyles.addCard}>
            <TextInput style={vStyles.input} placeholder="Item Name" value={itemName} onChangeText={setItemName} />
            <TextInput style={vStyles.input} placeholder="Price" value={itemPrice} onChangeText={setItemPrice} keyboardType="numeric" />
            <TouchableOpacity style={vStyles.mainBtn} onPress={async () => {
               if(!itemName || !itemPrice) return;
               await addDoc(collection(db, 'menuItems'), { stallId, itemName, price: Number(itemPrice) });
               setItemName(''); setItemPrice('');
            }}><Text style={vStyles.mainBtnT}>Add to Menu</Text></TouchableOpacity>
          </View>
          <FlatList data={menuItems} renderItem={({item}) => (
            <View style={vStyles.listItem}>
              <View><Text style={vStyles.listText}>{item.itemName}</Text><Text style={vStyles.listPrice}>₹{item.price}</Text></View>
              <TouchableOpacity onPress={() => deleteDoc(doc(db, 'menuItems', item.id))}><Text style={{color: '#ff4757', fontWeight: 'bold'}}>Delete</Text></TouchableOpacity>
            </View>
          )} />
        </View>
      )}

      {activeTab === 'history' && (
        <FlatList data={orders.filter(o => o.status === 'Ready' || o.status === 'Unavailable').sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))} renderItem={({item}) => (
          <View style={vStyles.historyCard}>
            <View style={vStyles.orderHeader}><Text style={vStyles.custName}>{item.customerName}</Text><Text style={vStyles.timeText}>{formatTime(item.timestamp)}</Text></View>
            <View style={vStyles.divider} />
            {item.items.map((i, idx) => (
              <View key={idx} style={vStyles.historyRow}>
                <Text>{i.quantity || 1}x {i.itemName}</Text>
                <Text>₹{i.price * (i.quantity || 1)}</Text>
              </View>
            ))}
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#eee'}}>
              <Text style={{fontWeight: 'bold', color: item.status === 'Ready' ? '#2ed573' : '#ff4757'}}>{item.status.toUpperCase()}</Text>
              <Text style={{fontWeight: 'bold', fontSize: 16}}>Total: ₹{item.items.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0)}</Text>
            </View>
          </View>
        )} />
      )}

      {activeTab === 'settings' && (
        <View style={vStyles.addCard}>
          <Text style={{fontWeight:'bold', marginBottom: 5}}>Stall Name:</Text>
          <TextInput style={vStyles.input} value={stallName} onChangeText={setStallName} />
          <TouchableOpacity style={vStyles.mainBtn} onPress={() => updateDoc(doc(db, 'stalls', stallId), { stallName })}><Text style={vStyles.mainBtnT}>Save Changes</Text></TouchableOpacity>
          <TouchableOpacity style={[vStyles.mainBtn, {backgroundColor: '#000', marginTop: 10}]} onPress={() => deleteDoc(doc(db, 'stalls', stallId)).then(() => setStallId(null))}><Text style={vStyles.mainBtnT}>Delete Stall</Text></TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={{marginTop: 30}}><Text style={{color: '#ff4757', textAlign: 'center', fontWeight: 'bold'}}>Logout Completely</Text></TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );

  return (
    <View style={vStyles.container}>
      <TouchableOpacity onPress={onLogout} style={{marginBottom: 20}}><Text style={{color: '#ff4757', fontWeight: 'bold'}}>← Back</Text></TouchableOpacity>
      <Text style={vStyles.title}>{userUid ? 'Launch Your Stall' : 'Vendor Login'}</Text>
      {!userUid ? (
        <>
          <TextInput style={vStyles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <TextInput style={vStyles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={vStyles.mainBtn} onPress={handleAuth}><Text style={vStyles.mainBtnT}>{isLogin ? 'Login' : 'Signup'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}><Text style={vStyles.switch}>Switch Mode</Text></TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput style={vStyles.input} placeholder="Stall Name" value={stallName} onChangeText={setStallName} />
          <TouchableOpacity style={vStyles.mainBtn} onPress={async () => {
            const d = await addDoc(collection(db, 'stalls'), { stallName, vendorId: userUid, isOpen: true });
            setStallId(d.id);
          }}><Text style={vStyles.mainBtnT}>Create Stall</Text></TouchableOpacity>
        </>
      )}
    </View>
  );
}

const vStyles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa', paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#e1e2e6', borderRadius: 15, marginBottom: 20, padding: 4 },
  tab: { flex: 1, padding: 10, alignItems: 'center' },
  activeTab: { backgroundColor: 'white', borderRadius: 12 },
  tabText: { fontWeight: 'bold', color: '#747d8c', fontSize: 10 },
  activeTabText: { color: '#ff4757', fontWeight: 'bold', fontSize: 10 },
  orderCard: { backgroundColor: 'white', padding: 18, borderRadius: 20, marginBottom: 12, elevation: 2 },
  historyCard: { backgroundColor: 'white', padding: 18, borderRadius: 20, marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  custName: { fontSize: 18, fontWeight: '800' },
  timeText: { fontSize: 12, color: '#a4b0be' },
  foodItem: { fontSize: 14, color: '#57606f', marginBottom: 4 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  sBtn: { backgroundColor: '#ffa502', padding: 10, borderRadius: 10, width: '30%', alignItems: 'center' },
  sBtnT: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  mainBtn: { backgroundColor: '#ff4757', padding: 15, borderRadius: 12, alignItems: 'center' },
  mainBtnT: { color: 'white', fontWeight: 'bold' },
  addCard: { backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 20 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: 'white', marginBottom: 5, borderRadius: 10, alignItems: 'center' },
  listText: { fontSize: 16, fontWeight: '600' },
  listPrice: { color: '#ff4757', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  switch: { textAlign: 'center', marginTop: 20, color: '#ff4757' }
});