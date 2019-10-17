import React, { useState, useCallback, useRef } from 'react'
import { Themed } from 'react-navigation'
import * as SecureStore from 'expo-secure-store'
import base64url from 'base64url'
import styled from '@emotion/native'
import { Button, ActivityIndicator } from 'react-native'
import nacl from 'tweetnacl'
import { TypedArrays } from '@react-frontend-developer/buffers'

import { entropyToMnemonic } from 'src/crypto'

import { useIdentity } from 'src/identity'
import { useTelepath } from 'src/telepath'

import { QRCodeThemed } from './ui'

const Container = styled.View({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center'
})

const SubContainer = styled.View({
  flexFlow: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '90%',
  height: '80%'
})

const IdentityName = styled(Themed.Text)({
  fontSize: 32,
  fontWeight: 'bold',
  marginBottom: 20
})

const Separator = styled.View(({ size }) => ({
  width: 1,
  height: size
}))

const Did = styled(Themed.Text)({
  fontSize: 12,
  marginBottom: 50,
  textAlign: 'center',
  flexGrow: 1
})

const IdentityDetails = ({ navigation }) => {
  const identityManager = useRef(undefined)
  const telepathProvider = useRef(undefined)
  const name = navigation.getParam('name', '')
  const did = navigation.getParam('did', '')
  const isOwn = navigation.getParam('isOwn', false)
  const [inProgress, setInProgress] = useState(false)

  const backupIdFromBackupKey = backupKey => {
    const mnemonic = entropyToMnemonic(backupKey)
    const mnemonicUint8Array = TypedArrays.string2Uint8Array(mnemonic, 'utf8')
    return base64url.encode(nacl.hash(mnemonicUint8Array))
  }

  const { deletePeerIdentity } = useIdentity({
    onReady: idManager => {
      identityManager.current = idManager
    },
    onPeerIdentitiesChanged: async () => {
      const backupEnabled = await SecureStore.getItemAsync('backupEnabled')
      if (backupEnabled) {
        const backupKey = base64url.toBuffer(await SecureStore.getItemAsync('backupKey'))
        const encryptedBackup = await identityManager.current.createEncryptedBackupWithKey(backupKey)
        const backupId = backupIdFromBackupKey(backupKey)
        writeBackupToIdBox(telepathProvider.current, encryptedBackup, backupId, identityManager.current.identityNames)
      } else {
        navigation.navigate('AddressBook')
      }
    }
  })

  const deleteIdentity = useCallback(() => {
    console.log(`deleting peer identity with name: ${name}`)
    setInProgress(true)
    deletePeerIdentity({ name })
  }, [])

  const writeBackupToIdBox = async (telepathProvider, encryptedBackup, backupId, identityNames) => {
    const message = {
      jsonrpc: '2.0',
      method: 'backup',
      params: [{
        encryptedBackup,
        backupId,
        identityNames
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
    onTelepathReady: ({ telepathProvider: tp }) => {
      telepathProvider.current = tp
    },
    onMessage: message => {
      console.log('received message: ', message)
      if (message.method === 'backup-response') {
        setInProgress(false)
        navigation.navigate('AddressBook')
      }
    },
    onError: async error => {
      console.log('error: ', error)
      setInProgress(false)
      await SecureStore.deleteItemAsync('backupEnabled')
      navigation.navigate('AddressBook')
    }
  })

  return (
    <Container>
      <SubContainer>
        <IdentityName>{name}</IdentityName>
        <Did>{did}</Did>
        <QRCodeThemed
          value={did}
          size={150}
        />
        <Separator size={40} />
        {inProgress
          ? <ActivityIndicator style={{ height: 38 }} />
          : !isOwn &&
            <Button
              title='Delete this identity'
              color='red'
              accessibilityLabel='delete identity'
              onPress={deleteIdentity}
            />}
      </SubContainer>
    </Container>
  )
}

export { IdentityDetails }
