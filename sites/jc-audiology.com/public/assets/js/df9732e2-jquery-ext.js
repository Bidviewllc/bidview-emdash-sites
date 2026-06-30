$.extend({   
    getUrlVars: function(){     
        var vars = [], hash;     
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');     
        for(var i = 0; i < hashes.length; i++)     {       
            hash = hashes[i].split('=');       
            vars.push(hash[0]);       
            vars[hash[0]] = hash[1];     
        }     return vars;   
    },   
    
    getUrlVar: function(name){     
        return $.getUrlVars()[name];   
    },
    
    shuffleArray: function (pArray){
        
        var i = pArray.length, j, temp;
        if ( i == 0 ) return pArray;
        while ( --i ) {
            j = Math.floor( Math.random() * ( i + 1 ) );
            temp = pArray[i];
            pArray[i] = pArray[j];
            pArray[j] = temp;
        }
        
        return pArray;
    }
});



