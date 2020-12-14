import { success, failure } from '../utils/res'
import { models } from '../models'
import * as network from '../network'
import constants from '../constants'
import * as short from 'short-uuid'
import * as lightning from '../utils/lightning'

type QueryType = 'onchain_address'
export interface Query {
  type: QueryType
  uuid: string
  result?: string
  app: string
}

let queries: { [k: string]: Query } = {}

// const hub_pubkey = '023d70f2f76d283c6c4e58109ee3a2816eb9d8feb40b23d62469060a2b2867b77f'
const hub_pubkey = '02290714deafd0cb33d2be3b634fc977a98a9c9fa1dd6c53cf17d99b350c08c67b'

export async function queryOnchainAddres(req, res) {
  const uuid = short.generate()
	const owner = await models.Contact.findOne({ where: { isOwner: true } })
	const app = req.params.app;

  const query:Query = {
    type:'onchain_address',
    uuid,
    app
  }

	const opts = {
		amt: constants.min_sat_amount,
		dest: hub_pubkey,
		data: <network.Msg>{
			type: constants.message_types.query,
			message: {
        content: JSON.stringify(query)
			},
			sender: { pub_key: owner.publicKey }
		}
	}
	try {
		await network.signAndSend(opts)
	} catch (e) {
		failure(res, e)
		return
	}

	let i = 0
	let interval = setInterval(() => {
		if (i >= 15) {
			clearInterval(interval)
			delete queries[uuid]
			failure(res, 'no response received')
			return
		}
		if (queries[uuid]) {
			success(res, queries[uuid].result)
			clearInterval(interval)
			delete queries[uuid]
			return
		}
		i++
	}, 1000)
}

export const receiveQuery = async (payload) => {
  const dat = payload.content || payload
  const sender_pub_key = dat.sender.pub_key
  const content = dat.message.content
  const owner = await models.Contact.findOne({ where: { isOwner: true } })

  if(!sender_pub_key || !content || !owner) {
    return console.log('=> wrong query format')
  }
  let q:Query
  try {
    q = JSON.parse(content)
  } catch(e) {
    console.log("=> ERROR receiveQuery,",e)
    return
  }
  let result = ''
  switch (q.type) {
    case 'onchain_address':
      const addy = await lightning.newAddress(lightning.NESTED_PUBKEY_HASH)
      const acc = {
        date: new Date(),
        pubkey: sender_pub_key,
        onchainAddress: addy,
        amount: 0,
        sourceApp: q.app,
        status:constants.statuses.pending,
        error:'',
      }
      await models.Accounting.create(acc)
      result = addy
    default:
      console.log('=> wrong q.type')
  }
  const ret:Query = {
    type: q.type,
    uuid: q.uuid,
    app: q.app,
    result,
  }
  const opts = {
		amt: constants.min_sat_amount,
		dest: sender_pub_key,
		data: <network.Msg>{
			type: constants.message_types.query_response,
			message: {
        content: JSON.stringify(ret)
			},
			sender: { pub_key: owner.publicKey }
		}
	}
	try {
		await network.signAndSend(opts)
	} catch (e) {
		console.log("FAILED TO SEND QUERY_RESPONSE")
		return
	}
}

export const receiveQueryResponse = async (payload) => {
  const dat = payload.content || payload
  // const sender_pub_key = dat.sender.pub_key
  const content = dat.message.content
  try {
    const q:Query = JSON.parse(content)
    queries[q.uuid] = q
  } catch(e) {
    console.log("=> ERROR receiveQueryResponse,",e)
  }
}