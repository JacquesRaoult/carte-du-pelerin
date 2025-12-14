import bcrypt from 'bcrypt'
import readline from 'readline'
import { pool } from '../src/services/database.js'

function promptUser (question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function listAdmins () {
  console.log('\n📋 Liste des administrateurs:\n')
  const [rows] = await pool.execute('SELECT id, username, created_at FROM users ORDER BY id')

  if (rows.length === 0) {
    console.log('   Aucun administrateur trouvé\n')
    return []
  }

  rows.forEach(user => {
    console.log(`   ${user.id}. ${user.username} (créé le ${new Date(user.created_at).toLocaleDateString('fr-FR')})`)
  })
  console.log('')
  return rows
}

async function createAdmin () {
  console.log('\n➕ Création d\'un nouvel administrateur\n')

  const username = await promptUser('Nom d\'utilisateur: ')
  if (!username) {
    console.log('❌ Le nom d\'utilisateur est requis')
    return
  }

  const password = await promptUser('Mot de passe (min 8 caractères): ')
  if (!password || password.length < 8) {
    console.log('❌ Le mot de passe doit contenir au moins 8 caractères')
    return
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    await pool.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    )
    console.log(`✅ Administrateur "${username}" créé avec succès!\n`)
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log(`❌ L'utilisateur "${username}" existe déjà\n`)
    } else {
      console.error('❌ Erreur:', error.message)
    }
  }
}

async function updatePassword () {
  const admins = await listAdmins()
  if (admins.length === 0) return

  console.log('🔑 Mise à jour du mot de passe\n')

  const username = await promptUser('Nom d\'utilisateur à modifier: ')
  if (!username) return

  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])
  if (rows.length === 0) {
    console.log(`❌ Utilisateur "${username}" non trouvé\n`)
    return
  }

  const password = await promptUser('Nouveau mot de passe (min 8 caractères): ')
  if (!password || password.length < 8) {
    console.log('❌ Le mot de passe doit contenir au moins 8 caractères')
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await pool.execute(
    'UPDATE users SET password_hash = ? WHERE username = ?',
    [passwordHash, username]
  )
  console.log(`✅ Mot de passe de "${username}" mis à jour!\n`)
}

async function deleteAdmin () {
  const admins = await listAdmins()
  if (admins.length === 0) return

  if (admins.length === 1) {
    console.log('⚠️  Impossible de supprimer le dernier administrateur\n')
    return
  }

  console.log('🗑️  Suppression d\'un administrateur\n')

  const username = await promptUser('Nom d\'utilisateur à supprimer: ')
  if (!username) return

  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])
  if (rows.length === 0) {
    console.log(`❌ Utilisateur "${username}" non trouvé\n`)
    return
  }

  const confirm = await promptUser(`⚠️  Confirmez la suppression de "${username}" (oui/non): `)
  if (confirm.toLowerCase() !== 'oui') {
    console.log('❌ Suppression annulée\n')
    return
  }

  await pool.execute('DELETE FROM users WHERE username = ?', [username])
  console.log(`✅ Administrateur "${username}" supprimé!\n`)
}

async function showMenu () {
  console.log('═══════════════════════════════════════')
  console.log('   🔐 GESTION DES ADMINISTRATEURS')
  console.log('═══════════════════════════════════════')
  console.log('1. Lister les administrateurs')
  console.log('2. Créer un administrateur')
  console.log('3. Modifier un mot de passe')
  console.log('4. Supprimer un administrateur')
  console.log('5. Quitter')
  console.log('═══════════════════════════════════════\n')

  const choice = await promptUser('Votre choix (1-5): ')

  switch (choice) {
    case '1':
      await listAdmins()
      break
    case '2':
      await createAdmin()
      break
    case '3':
      await updatePassword()
      break
    case '4':
      await deleteAdmin()
      break
    case '5':
      console.log('👋 Au revoir!\n')
      await pool.end()
      process.exit(0)
      break
    default:
      console.log('❌ Choix invalide\n')
  }

  // Retour au menu
  await showMenu()
}

async function main () {
  try {
    // Test de connexion
    await pool.query('SELECT 1')
    await showMenu()
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)
