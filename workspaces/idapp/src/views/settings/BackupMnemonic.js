import React, { useState, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import { Text, Button } from 'react-native'

import { IdentityManager } from 'src/identity'
import { useTelepath } from 'src/telepath'
import { Container, Subcontainer, Description } from './ui'

const BackupMnemonic = ({ navigation }) => {
  const [mnemonic, setMnemonic] = useState(undefined)
  const [backupReady, setBackupReady] = useState(false)

  const onDismiss = useCallback(() => {
    navigation.navigate('Settings')
  }, [])

  const writeBackupToIdBox = async (telepathProvider, encryptedBackup) => {
    const message = {
      jsonrpc: '2.0',
      method: 'backup',
      params: [{
        encryptedBackup
      }, {
        from: telepathProvider.clientId
      }]
    }
    try {
      await telepathProvider.emit(message, {
        to: telepathProvider.servicePointId
      })
    } catch (e) {
      console.log(e.message)
    }
  }

  useTelepath({
    name: 'idbox',
    onTelepathReady: async ({ telepathProvider }) => {
      const identityManager = await IdentityManager.instance()
      const { encryptedBackup, mnemonic } = await identityManager.createEncryptedBackup()
      setMnemonic(mnemonic)
      console.log('encryptedBackup=', encryptedBackup)
      writeBackupToIdBox(telepathProvider, encryptedBackup)
    },
    onMessage: async message => {
      console.log('received message: ', message)
      if (message.method === 'backup-response') {
        await SecureStore.setItemAsync('backupEnabled', 'true')
        setBackupReady(true)
      }
    },
    onError: error => {
      console.log('error: ', error)
    }
  })

  return (
    <Container>
      <Subcontainer style={{
        justifyContent: 'center'
      }}
      >
        {
          backupReady
            ? (
              <>
                <Description>
                  Below is your passphrase mnemonic.
                  You will need it if you ever need to restore your identities.
                </Description>
                <Description style={{ color: 'red' }}>
                  Keep your passphrase off-line and safe. We will not be
                  able to restore it for you if you loose it.
                </Description>
                <Text style={{ textAlign: 'center', marginBottom: 50 }}>{mnemonic}</Text>
              </>
            )
            : <Text style={{ textAlign: 'center', marginBottom: 50 }}>Creating first backup...</Text>
        }
        <Button
          onPress={onDismiss}
          title='Got it'
          accessibilityLabel='Got it'
        />
      </Subcontainer>
    </Container>
  )
}

export { BackupMnemonic }
