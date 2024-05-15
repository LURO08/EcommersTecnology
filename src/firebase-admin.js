const admin = require('firebase-admin');
const express = require('express');
const app = express();

admin.initializeApp({
    credential: admin.credential.cert({
        // Las claves de la configuración de Firebase
    }),
    databaseURL: "firebase-adminsdk-2u6qg@commers-182b9.iam.gserviceaccount.com"
});

app.delete('/delete-user/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        await admin.auth().deleteUser(uid);
        await deleteDoc(doc(db, "users", uid)); // Asegúrate de que el UID corresponda al ID en Firestore
        res.send({ status: 'success', message: 'User deleted successfully' });
    } catch (error) {
        console.error('Failed to delete user:', error);
        res.status(500).send({ status: 'error', message: 'Failed to delete user' });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
