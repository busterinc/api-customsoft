
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function activityTrace(old, val, auth, err, act, fnc, resp) {
    console.log('old *********************', old)
    console.log('val *********************', val)
    console.log('auth *********************', auth)
    console.log('err *********************', err)
    console.log('act *********************', act)
    console.log('fnc *********************', fnc)
    console.log('resp *********************', resp)

    const { data, error } = await supabase
        .from('activity_log')
        .insert([{
            old_value: old,
            new_value: val,
            author: auth,
            error: err,
            action: act,
            method: fnc,
            resp: resp
        }])
        .select()
    console.log('data..............', data)
    console.log('error..............', error)
    if (error) throw error;
}

module.exports = { activityTrace };
