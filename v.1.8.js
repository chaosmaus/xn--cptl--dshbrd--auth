


$(async function () {
    // 
    // Helper functions
    //
    $('#block--upload').removeClass('hidden')
    $('#block--home').addClass('hidden')
    let currentCategory;

    const logout = async () => {
        try {
            console.log("Logging out");
            await auth0Client.logout({
                logoutParams: {
                    returnTo: window.location.origin
                }
            });
        } catch (err) {
            console.log("Log out failed", err);
        }
    };

    const getUserInfo = async (username) => {
        const token = await auth0Client.getTokenSilently();
        $.ajax({
            url: `https://server.xn.capital/api/users/profile`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            success: function (response) {
                let userDb = response.matchedUser.user; //DB user info
                console.log('got webflow data', response)

                // Use Quiz as well
                if (userDb.quiz_answers) {
                    let quiz = userDb.quiz_answers
                    console.log(quiz)

                    $('.get-started--progress-bar--filled').css('width', `${quiz.progress}`)
                    let fullName = quiz.question7.name
                    let email = quiz.question7.email
                    let firstName = fullName.split(' ')[0];
                    $('.darshboard--name').text(`Hey, ${firstName}`)
                    $('.darshboard--full-name').text(`${fullName}`)
                    $('.darshboard--username').text(`${email}`)

                    $(`#progress-card--quiz`).find(`.get-started--progress-bar--filled`).css('width', '100%')
                    $(`#progress-card--quiz`).find(`.get-started--card--text`).text('Retake Quiz')
                    $(`#progress-card--quiz`).find(`.get-started--checkbox`).addClass('filled')

                    let claimsAvg = Math.round((Number(quiz.question3.maxClaimsAmount) + Number(quiz.question3.minClaimsAmount)) / 2)
                    $('#heading--claims').text(`$${Number(claimsAvg).toLocaleString()}`)
                    localStorage.setItem('claims', `$${Number(claimsAvg).toLocaleString()}`)
                    if (quiz.question2a.grossWrittenPremium) {
                        $('#heading--premium').text(`${quiz.question2a.grossWrittenPremium}`)
                        localStorage.setItem('premium', quiz.question2a.grossWrittenPremium)
                    } else if (quiz.question2b.spentOnAnnualPremiumms) {
                        $('#heading--premium').text(`${quiz.question2b.spentOnAnnualPremiumms}`)
                        localStorage.setItem('premium', quiz.question2b.spentOnAnnualPremiumms)
                    }

                } else if (userDb.survey_answers) {
                    let survey = userDb.survey_answers
                    console.log(survey)

                    $('.get-started--progress-bar--filled').css('width', `${survey.progress}`)
                    let fullName = survey.contact.name
                    let email = survey.contact.email
                    let firstName = fullName.split(' ')[0];
                    $('.darshboard--name').text(`Hey, ${firstName}`)
                    $('.darshboard--full-name').text(`${fullName}`)
                    $('.darshboard--username').text(`${email}`)

                } else {
                    $('.get-started--progress-bar--filled').css('width', `0%`)
                }
                $('.dashboard--loading--mask').addClass('invisible')
                setTimeout(() => {
                    $('.dashboard--loading--mask').addClass('hidden')
                }, 400);
            },
            error: function (xhr, status, error) {
                console.error('User info retrieval failed:', error);
            }
        });
    };

    const getSubstringAfterDashDash = (str) => {
        let dashIndex = str.indexOf('--');
        if (dashIndex !== -1) {
            return str.substring(dashIndex + 2); // +2 to skip the "--" itself
        }
        return ''; // Return an empty string if "--" is not found
    };

    const tabsController = () => {
        $('.dashboard--panel--link').on('click', (e) => {
            //reset instances
            $('.dashboard--panel--link').removeClass('active')
            $('.dashboard--panel--icon').removeClass('active')
            $('.dashboard--block').each((index, element) => {
                if (!($(element).hasClass('hidden'))) $(element).addClass('hidden')
            })
            $(e.target).closest('.dashboard--panel--link').addClass('active');
            $(e.target).closest('.dashboard--panel--link').find('.dashboard--panel--icon').addClass('active')

            let tabId = $(e.target).closest('.dashboard--panel--link').attr('id');
            tabId = getSubstringAfterDashDash(tabId)
            $(`#block--${tabId}`).removeClass('hidden')
        });
    };

    const logoutController = () => {
        $('.dashboard--menu--logout--button').on('click', async () => {
            await logout();
        })
    };

    //
    // This is the code that runs when the page first loads
    //
    /* DASHBOARD SYSTEM */
    $('.dashboard--loading--mask').removeClass('hidden')
    $('.dashboard--loading--mask').removeClass('invisible')

    const auth0Client = await auth0.createAuth0Client({
        domain: "login.xn.capital",
        clientId: "NoSXDnJTyhvN9uXGuAbqkCXeEdf15DzV",
        authorizationParams: {
            audience: "https://server.xn.capital"
        },
    });
    console.log("created client");

    const user = await auth0Client.getUser();
    if (user === undefined) {
        // Send the user back to the login page if they are not logged in
        window.location.href = '/login';
        return;
    }

    if (user.given_name) $('.dashboard--heading--user').text(user.given_name)
    else $('.dashboard--heading--user').text(user.name)
    await getUserInfo(user.email);

    tabsController();
    logoutController();

    /* UPLOAD LOGIC START */


    const callApi = async (url, method, body) => {
        const token = await auth0Client.getTokenSilently();
        try {

            params = {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
            if (body) {
                params.body = JSON.stringify(body);
                params.headers['Content-Type'] = 'application/json';
            }

            const response = await fetch(url, params);
            return response;
        } catch (e) {
            console.error(`Error calling API: ${e}`);
        }
    }

    async function handleUpload(files, category) {
        const filenames = Array.from(files).map(file => file.name);
        const url = `https://server.xn.capital/api/users/documents/${category}/upload-urls`;
        const response = await callApi(url, "POST", { filenames });
        console.log('response', response)
        if (response.status !== 200) {
            console.error("error getting upload URLS: ", response);
            alert("Error getting upload URLs");
            return;
        }
        const presignedURLs = await response.json();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const presignedURL = presignedURLs[i];
            const formData = new FormData();
            for (const key in presignedURL.fields) {
                formData.append(key, presignedURL.fields[key]);
            }
            formData.append('file', file);
            await fetch(presignedURL.url, {
                mode: 'no-cors',
                method: 'POST',
                body: formData
            });
        }
    }

    const updateCard = () => {
        const files = document.getElementById('fileInput').files;
        //$('#fileInput').val('')
        console.log(files[0].name)


        $.each(files, function (index, file) {
            let fileName = file.name; // Assuming fileArray contains file objects
            let $fileHtml = $(
                `<div class="upload--form--file">
            <img src="https://assets-global.website-files.com/64cbd86665037e2f4e4e8779/65ea3cbdb64bfd322b34877c_Progress%20Circular%20dark.svg" loading="lazy" alt="">
            <div>${fileName}</div>
            <div class="upload--form--button">
              <img src="https://assets-global.website-files.com/64cbd86665037e2f4e4e8779/65ea3d16e67f6a736ac1d5a9_upload--form-trash.svg" loading="lazy" alt="">
            </div>
          </div>`
            );
            $('.upload--form--file--wrapper').append($fileHtml);
        });


    }
    const updateCardFiles = () => {
        console.log('currentCategory', currentCategory)
        //match the category
        $('.upload--card').each((i, element) => {
            if ($(element).find('.upload--card--heading').text() === currentCategory) {
                const files = document.getElementById('fileInput').files;

                $.each(files, function (index, file) {
                    let fileName = file.name; // Get the name of the file
                    let $fileHtml = $(
                        `<div class="upload--card--file">
                            <img src="https://assets-global.website-files.com/64cbd86665037e2f4e4e8779/65ea3196de10bb7d26ee8324_Progress%20Circular.svg" loading="lazy" alt="">
                            <div>${fileName}</div>
                         </div>`
                    );
                    $(element).find('.upload--card--file--wrapper').append($fileHtml); // Append new file entry
                });

            }
        })


    }

    const createCardFiles = (category, files) => {
                $.each(files, function (index, file) {
                    let fileName = parseDocumentName(file.filename)
                    let $fileHtml = $(
                        `<a class="upload--card--file" href="${file.url}">
                            <img src="https://assets-global.website-files.com/64cbd86665037e2f4e4e8779/65ea3196de10bb7d26ee8324_Progress%20Circular.svg" loading="lazy" alt="">
                            <div>${fileName}</div>
                         </a>`
                    );
                    $(`#${category}`).find('.upload--card--file--wrapper').append($fileHtml); // Append new file entry
                });


                $(`#${category}`).addClass('uploaded')
                 $(`#${category}`).find('.upload--more').removeClass('hidden')
                 $(`#${category}`).find('.upload--new').addClass('hidden')
                 $(`#${category}`).find('.upload--check--button').addClass('hidden')
    }

    const uploadCardController = () => {
        $('.upload--card').each((index, element) => {
            if ($(element).find('.upload--card--heading').text() === currentCategory) {
                $(element).addClass('uploaded')
                $('.upload--more').removeClass('hidden')
                $('.upload--new').addClass('hidden')
                $('.upload--check--button').addClass('hidden')
            }
        })
    }


    async function uploadFiles() {
        let files = document.getElementById('fileInput').files;
        let category = currentCategory.replace(/\s+/g, '').toLowerCase();
        console.log(files)
        if (files.length > 0) {

            await handleUpload(files, category);
            console.log('Upload Complete');
            $('.upload--form--warning').css('color', '#bdf0a8')
            $('.upload--form--warning').text('Files uploaded successfully! You may close this window.')
            $('.upload--form--warning').show()
            uploadCardController()
        } else {
            console.log('no files selected');
            $('.upload--form--warning').css('color', '#f0a8a9')
            $('.upload--form--warning').text('An error occurred while uploading files. Try again later.')
            $('.upload--form--warning').show()
        }
    }

    async function handleGetDocuments(category) {
        const url = `https://server.xn.capital/api/users/documents/${category}/download-urls`
        const response = await callApi(url, "GET");
        if (response.status !== 200) {
            console.error("error getting download URLS: ", response);
            alert("Error getting download URLs");
            return;
        }
    
        const responseData = await response.json();
        console.log("responseData: ", responseData);
        createCardFiles(category, responseData);
    }

    function parseDocumentName(documentName) {
        const regex = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z-/;
        const parsedName = documentName.replace(regex, '');
        return parsedName;
    }
    

    
    const initiateCards = async () => {
        await handleGetDocuments('payrolldata')
        updateUploadCount();
    }


    const updateUploadCount = () => {
        // get list of categories
        // feed each card with their respective files
        // get count of cards without uploads
        let uploadCount = 0;
        $('.upload--card').each((index, element)=>{
            if(!($(element).hasClass('uploaded'))) uploadCount++
        })

        $('.upload--count--text').text(uploadCount)

    }

    //control upload checkmark
    $('.upload--check--button').on('click', (e)=>{
        let clickedButton = $(e.target).closest('.upload--check--button')
        clickedButton.find('.upload--check--decoration').toggleClass('active')
    })

    //show upload file form
    $('.upload--card--button').click(function (e) {
        let clickedButton = $(e.target).closest('.upload--card')
        $('.upload--form--warning').hide()
        $('.upload--form--mask').css('display', 'flex')
        currentCategory = clickedButton.find('.upload--card--heading').text()
        console.log('clicked button', clickedButton.find('.upload--card--heading').text())
    });

    //close form
    $('.upload--form--close').click(function (e) {
        updateUploadCount()
        $('.upload--form--mask').css('display', 'none')
        $('.upload--form--file--wrapper').empty();
    });

    //select files
    $('.upload--form--file.button').click(function (e) {
        $('#fileInput').trigger('click')
    });

    //submit a
    $('.upload--button').click(function (e) {
        $('#fileSubmit').trigger('click')
    });

    $('#fileInput').on('change', function () {
        updateCard();
    });

    //submit b
    $('#fileSubmit').click(function (e) {
        e.preventDefault();
        updateCardFiles();
        uploadFiles();
    });

    function checkWindowSizeAndClickTab() {
        if ($(window).width() < 992) {
            $('#tab--home').trigger('click');
        }
    }

    //reset files
    $('.button--reset').click(function() {
        $('#fileInput').val('');
        $('.upload--form--file--wrapper').empty();
    });
    
    
    // Run the function when the page loads
    checkWindowSizeAndClickTab();
    
    // Run the function every time the window is resized
    $(window).on('resize', function() {
        checkWindowSizeAndClickTab();
    });
    

    initiateCards();
    /* UPLOAD END */

});
