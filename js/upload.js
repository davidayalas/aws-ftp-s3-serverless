function getUploadForm(callback){
    $.ajax({
        type: "GET", 
        url: "https://favyoweaj6.execute-api.eu-west-1.amazonaws.com/dev/getuploadform?success_redirect=",
        headers: {
            "Authorization": window.localStorage.getItem("token")
        },   
        dataType: 'json',
        crossDomain: true,
        contentType: 'application/json',
        error: function(e) {
        },       
        success: function(data){
            window.signedFormData = data;
            if(typeof callback==="function"){
                callback();
            }
        } 
    });
}

function generateFormData(_fnUpload, file){
    var fd = new FormData();
    for(var k in window.signedFormData){
        if(["endpoint"].indexOf(k)===-1){
            fd.append(k, window.signedFormData[k]);
        }
    }
    fd.append('file', file);
    _fnUpload(fd);
}

function fnUpload(formdata){
    $("h1").text("Uploading...");
    $.ajax({
        url: window.signedFormData.endpoint,
        type: 'POST',
        data: formdata,
        processData: false,
        dataType: 'json',
        contentType: false,
        success: function(response){
            $("h1").text("Uploaded!");
        }
    });
}

// Sending AJAX request and upload file
function uploadData(file){
    if(!window.signedFormData){
        getUploadForm(function(){generateFormData(fnUpload,file)});
    }else{
        generateFormData(fnUpload,file);
    }
}

$(function() {

    // preventing page from redirecting
    $("html").on("dragover", function(e) {
        e.preventDefault();
        e.stopPropagation();
        $("h1").text("Drag here");
    });

    $("html").on("drop", function(e) { e.preventDefault(); e.stopPropagation(); });

    // Drag enter
    $('.upload-area').on('dragenter', function (e) {
        e.stopPropagation();
        e.preventDefault();
        $("h1").text("Drop");
    });

    // Drag over
    $('.upload-area').on('dragover', function (e) {
        e.stopPropagation();
        e.preventDefault();
        $("h1").text("Drop");
    });

    // Drop
    $('.upload-area').on('drop', function (e) {
        e.stopPropagation();
        e.preventDefault();
        $("h1").text("Upload");
        var file = e.originalEvent.dataTransfer.files;
        uploadData(file[0]);
    });

    // Open file selector on div click
    $("#uploadfiledrag").click(function(){
        $("#uploadfile").click();
    });

    // file selected
    $("#uploadfile").change(function(){
        //uploadData(generateFormData($('#uploadfile')[0].files[0]));
        if(!window.signedFormData){
            getUploadForm(function(){generateFormData(fnUpload,$('#uploadfile')[0].files[0])});
        }else{
            generateFormData(fnUpload,$('#uploadfile')[0].files[0]);
        }
    });
});