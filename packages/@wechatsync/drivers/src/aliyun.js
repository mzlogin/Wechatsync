export default class AliyunAdapter {

    constructor(ac) {
        this.verion = '0.0.1'
        this.name = 'aliyun'
        chrome.cookies.getAll({ domain: "developer.aliyun.com" }, function (cookies) {
            this.c_csrf = cookies.find(c => c.name == 'c_csrf').value
        })

        modifyRequestHeaders('developer.aliyun.com', {
            Origin: 'https://developer.aliyun.com',
            Referer: 'https://developer.aliyun.com/article/new'
        }, [
            '*://developer.aliyun.com/*',
        ])
    }

    async getMetaData() {
        var data = await $.get('https://developer.aliyun.com/developer/api/my/user/getUser')
        console.log(data)
        return {
            uid: data.data.uccId,
            title: data.data.nickname,
            avatar: data.data.avatar,
            type: 'aliyun',
            displayName: '阿里云开发者',
            raw: data.data,
            supportTypes: ['markdown', 'html'],
            home: 'https://developer.aliyun.com/my',
            icon: 'https://developer.aliyun.com/favicon.ico',
        }
    }

    async preEditPost(post) {
        var div = $('<div>')
        $('body').append(div)

        try {
            div.html(post.content)
            var doc = div
            // var pres = doc.find("pre");
            tools.processDocCode(div)
            tools.makeImgVisible(div)

            var tempDoc = $('<div>').append(doc.clone())
            post.content =
                tempDoc.children('div').length == 1
                    ? tempDoc.children('div').html()
                    : tempDoc.html()

            console.log('after.predEdit', post.content)
        } catch (e) {
            console.log('preEdit.error', e)
        }
    }

    async addPost(post) {
        console.log('TurndownService', turndown)
        var turndownService = new turndown()
        turndownService.use(tools.turndownExt)
        var markdown = turndownService.turndown(post.post_content)
        const { data } = await axios.post('https://developer.aliyun.com/developer/api/articleDraft/putDraft?p_csrf=' + c_csrf, {
            title: post.post_title,
            content: markdown,
            abstractContent: '',
            contentRender: '',
            productTags: [],
            freeTierVOS: []
        })
        console.log(data)
        if (data.success === false) {
            throw new Error('添加草稿失败' + data.message);
        }
        var post_id = data.data.aid
        return {
            status: 'success',
            post_id: post_id,
            draftLink: 'https://developer.aliyun.com/article/new?edit=' + post_id,
        }
    }

    async uploadFile(file) {
        var imageId = Date.now() + Math.floor(Math.random() * 1000)
        var file = new File([file.bits], file.name, {
            type: file.type,
        });

        // 先获取上传图片的信息
        var getImageUploadInfoUrl = 'https://developer.aliyun.com/developer/api/image/getImageUploadUrl?p_csrf=' + c_csrf;
        const { data } = await axios.post(getImageUploadInfoUrl, {
            imageName: file.name,
            imageSize: file.size
        });
        console.log('getImageUploadInfo', data)
        if (data.success === false) {
            throw new Error('获取上传图片信息失败' + data.message);
        }
        var uploadUrl = data.data.uploadUrl;
        var imageUrl = data.data.imageUrl;

        // 上传图片
        const res2 = await axios.put(uploadUrl, file, {
            headers: data.data.header
        })
        console.log('uploadFile', res2)
        if (res2.status !== 200) {
            throw new Error('图片上传失败 ' + file.name)
        }

        return [
            {
                id: imageId,
                object_key: imageId,
                url: imageUrl,
            }
        ]
    }

    async editPost(postId, post) {
        console.log('TurndownService', turndown)
        var turndownService = new turndown()
        turndownService.use(tools.turndownExt)
        var markdown = turndownService.turndown(post.post_content)
        const { data } = await axios.post('https://developer.aliyun.com/developer/api/articleDraft/putDraft?p_csrf=' + c_csrf, {
            aid: postId,
            title: post.post_title,
            content: markdown,
            abstractContent: post.desc,
            contentRender: '',
            productTags: [],
            freeTierVOS: []
        })
        console.log(data)
        if (data.success === false) {
            throw new Error('编辑草稿失败' + data.message);
        }
        return {
            status: 'success',
            post_id: postId,
            draftLink: 'https://developer.aliyun.com/article/new?edit=' + postId,
        }
    }
}